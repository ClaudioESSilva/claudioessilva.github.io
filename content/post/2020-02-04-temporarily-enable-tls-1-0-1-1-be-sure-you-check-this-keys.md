---
author: claudiosilva
comments: true
date: "2020-02-04T00:00:00Z"
tags:
- minisql.exe
- PowerShell
- Registry
- Security
- SQLServer
- syndicated
- TLS
- TLS1.0
- TLS1.1
- Windows
title: Temporarily enable TLS 1.0/1.1? - Be sure you check this keys
---
There are some actions that we know that will have to be repeated from time to time, but the surprise comes when it’s time to do so and the process that used to work does not work anymore.

This is a short post to document a slight change that I had to do to achieve the same final result as the first time.

## Long story short

A client needed to run a setup to install an application. This setup uses a utility called `minisql.exe` to test database connection. The problem is that this utility only works with TLS 1.0/1.1 and, on our systems, we only have TLS 1.2 enabled.

## Temporary workaround

We got into an impasse where we would not enable TLS 1.0 on the database server (which shares multiple databases) hence, as a workaround, we have suggested installing a SQL Server express edition instance on the application server just to surpass this step of the application setup. The funny (or not) part is that after installation, the application works just fine with any other driver that supports de TLS 1.2.

NOTE: It is strange why the vendor decided on this approach. I mean, having **two different ways** to test the access to the database. Even more when one of them is very limited. Maybe legacy... ¯&#092;_(ツ)_/¯

## Easy! Just repeat the steps that have worked before

With all the approvals to get these settings turned on as an exception for a short period of time, I just have to run the reg file that will turn on the TLS 1.0 and 1.1.

### Registry keys to

**Enable TLS 1.0**
`[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server] "Enabled"=dword:00000001

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server] "DisabledByDefault"=dword:00000000

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Client] "Enabled"=dword:00000001

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Client] "DisabledByDefault"=dword:00000000`

**Enable TLS 1.1**
`[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server] "Enabled"=dword:00000001

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server] "DisabledByDefault"=dword:00000000

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Client] "Enabled"=dword:00000001

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Client] "DisabledByDefault"=dword:00000000`

You can find more about this and other keys on <a href="https://docs.microsoft.com/en-us/windows-server/identity/ad-fs/operations/manage-ssl-protocols-in-ad-fs#enable-and-disable-tls-10" rel="noopener" target="_blank">Microsoft Documentation</a>.

After this change, we need to restart the server. At this time I was confident that when we come back I could test the connections and everything would be as wanted to move on. However...that was not the case!

This continued to yield the following the error message:

<blockquote>Connection Problem: [DBNETLIB][ConnectionOpen (SECDoClientHandshake()).]SSL Security error

## Analyse

Because it didn't work, I first scratched my head trying to understand what could be different... I haven't touched the reg file since the first time, when it worked.

### Digging on the interwebs...again

Using my *google-fu* skills lead me to all of the 99% of the posts about this error message where they just talk about the 4 registry keys (for each version) that need to be changed. I gave up when I was already on the third/fourth page of results. Yes, I was starting to think I was crazy :-)
I decided to request some help from a colleague of the Windows team. I needed a different pair of eyes to be sure that I wasn't missing something.

### I was not seeing the obvious

After some time, I decided to compare the two servers to be sure that, on these registry keys everything was equal. Surprise..surprise...was not!
On the most recent server, there was a `Hashes` folder (on HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes) with another two folders (MD5/SHA) which contains entries named `Enabled` with configured value `0`.

`[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes]

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes\MD5]
"Enabled"=dword:00000000

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes\SHA]
"Enabled"=dword:00000000`

### Fixing it

I decided to backup the registry keys and then, I have deleted the `Hashes` folder. After the restart...yes you guess it right, it worker!

## Bottom line

The keys exported on the registry didn't have the `Hashes` entries and when imported they also didn't remove the existing one.

NOTE: Don't forget to revert the changes after you finish your tests/workaround.

This time, using PowerShell :-)
**Disable TLS 1.0**

``` powershell
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -name 'Enabled' -value
'0' -PropertyType 'DWord' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -name 'DisabledByDefault' -value 1 -PropertyType 'DWord' -Force | Out-Null

New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Client' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Client' -name 'Enabled' -value '0' -PropertyType 'DWord' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Client' -name 'DisabledByDefault' -value 1 -PropertyType 'DWord' -Force | Out-Null
Write-Host 'TLS 1.0 has been disabled.'
```

**Disable TLS 1.1**

``` powershell
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -name 'Enabled' -value '0' -PropertyType 'DWord' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -name 'DisabledByDefault' -value 1 -PropertyType 'DWord' -Force | Out-Null

New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Client' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Client' -name 'Enabled' -value '0' -PropertyType 'DWord' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Client' -name 'DisabledByDefault' -value 1 -PropertyType 'DWord' -Force | Out-Null
Write-Host 'TLS 1.1 has been disabled.'
```

**Add Hashes folder back**

``` powershell
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes' -Force | Out-Null

New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes\MD5' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes\MD5' -name 'Enabled' -value '0' -PropertyType 'DWord' -Force | Out-Null

New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes\SHA' -Force | Out-Null

New-ItemProperty -path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Hashes\SHA' -name 'Enabled' -value '0' -PropertyType 'DWord' -Force | Out-Null
```

Thanks for reading!
