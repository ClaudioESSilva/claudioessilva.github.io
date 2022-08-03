---
author: claudiosilva
comments: true
date: "2017-09-14T00:00:00Z"
tags:
- Active Directory
- Change Password
- Different Domains
- DirectorySearcher
- LDAP
- PowerShell
- PowerShell Tip
- Scripting
title: '[PowerShell] From 20 minutes to 20 seconds - Change domain user password on
  multiple domains without login into each one'
---
I'm working on a environment where I have to deal with multiple domains.
The user's password needs to be updated each 40/45 days (it depends on the domain).

<h2>Can you see the pain?</h2>
This means that every month and half I have to dedicate like 20 minutes to change my password on 10 different domains by logging in to a host that belongs to that domain to be able to change it.

Because I would like a faster way to do this and I'm not proficient with AD, I asked help to Jaap Brasser (<a href="http://www.jaapbrasser.com">b</a> \| <a href="http://@Jaap_Brasser">t</a>). He pointed me to a blog post he has written sometime ago called <a href="http://www.jaapbrasser.com/active-directory-friday-change-user-password/" target="_blank" rel="noopener">Active Directory Friday: Change a user’s password</a>.

This code resets the password and not to change/update it. Because I don't have permission to do it, this method won't work for me. Also, I don't have the AD module with all `*-ad*` cmdlets installed on my machine.

Despite this, his code gave me some clues about the way it could work. I did some more research and finally I found a way to do it from a single machine.

<strong>Disclaimer: For this script work, you need to be able to <a href="https://technet.microsoft.com/en-us/library/aa996205%28v=exchg.65%29.aspx?f=255&amp;MSPPError=-2147217396" target="_blank">query the LDAP</a> on the different domains. Some things may differ between my environment configuration and yours. Example: In my environment I had to use the IP of the DC instead of name.</strong>

When you run the script you will be prompted for your current/old credentials and the new password.

``` powershell
$oldCredential = Get-Credential -Message "Enter domain, user name and old password"
$NewPassword = Read-Host -AsSecureString -Prompt 'Enter new password'

#Here, we get the domain part from credential - in my case I had to use the IP
$DC = $($oldCredential.UserName.split('\')[0])
$userName = $($oldCredential.UserName.split('\')[1])
 
$DomainEntry = New-Object -TypeName System.DirectoryServices.DirectoryEntry "LDAP://$DC" ,$oldCredential.UserName,$($oldCredential.GetNetworkCredential().password)
$DomainName = $DomainEntry.name

# Example search against remote domain
$Searcher = New-Object -TypeName System.DirectoryServices.DirectorySearcher
$Searcher.Filter = "(samaccountname=$userName)"
$Searcher.SearchRoot = $DomainEntry
 
$user = [adsi]$Searcher.FindOne().Path
$user.ChangePassword($oldCredential.GetNetworkCredential().password, [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($NewPassword)))
```

With this code you should be able to change your password on a different domain from just one location.

I have updated my password on all domains in less than 20 seconds.

Thanks for reading
