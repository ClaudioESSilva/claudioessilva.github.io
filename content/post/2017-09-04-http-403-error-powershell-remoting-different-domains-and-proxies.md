---
author: claudiosilva
comments: true
date: "2017-09-04T00:00:00Z"
tags:
- Different Domains
- HTTP
- Monitoring
- Nagios
- PowerShell
- Proxies
- Proxy
- Remoting
- SQLServer
- syndicated
title: "HTTP 403 error - PowerShell Remoting, Different Domains and Proxies"
---
On my day to day work I use [Nagios](https://www.nagios.org/) monitoring software. I want to add some custom SQL Server scripts to enrich the monitoring, and to accomplish this I will need to:

* Find a folder
* Create a sub folder
* Copy bunch of file
* edit a ini file to verify/add new entries

all of this for every single host on my entire estate. Obviously (for me :-) ) I decided to use PowerShell!

## "Hold your horses!"

Yes, calm down. I'm working on a client where the network it's anything but simple. As far as I know they have 10 domains and few of them have trust configured, but even those that have, is not in both ways... so I didn't expect an easy journey to get the task done.
Side note: For those thinking how I can live without PowerShell, I can't! But,  the majority of my time using PowerShell is with SQL Server, mainly using SMO (with the help of [dbatools](https://dbatools.io), which means I haven't struggle that much until now.

## "...WinRM client received an HTTP status code of 403..."

Ok, here we go!

### "PowerShell Remoting and different domains..."

....needs different credentials. This is a requirement when using ip address.
If we try to run the following code:

``` powershell
$DestinationComputer = '10.10.10.1'
Invoke-Command -ScriptBlock { Get-Service *sql* } -ComputerName $DestinationComputer
```

we will get the following error message:

> Default authentication may be used with an IP address under the following conditions: the transport is HTTPS or the destination is in the TrustedHosts list, and explicit credentials are provided.

First, I add the destination computer to my TrustedHosts. We can do this in two ways:
Using Set-Item PowerShell cmdlet

``` powershell
Set-Item WSMan:\localhost\Client\TrustedHosts "10.10.10.1"
```

Or using `winrm` executable:

``` powershell
winrm s winrm/config/client '@{TrustedHosts="10.10.10.1"}'
```

Note: You can use "*" (asterisk) to say all remote hosts are trusted. Or just a segment of IPs like "10.10.10.*".
But, there is another requirement like the error message says "...and explicit credentials are provided.". This means that we need to add, and in this case I really want to use, a different credential so I have modified the script to:

``` powershell
$DestinationComputer = '10.10.10.1'
Invoke-Command -ScriptBlock { Get-Service *sql* } -ComputerName $DestinationComputer -Credential domain2\user1
```

Now I get prompted for the user password and I can... get a different error message (*sigh*):

> [10.10.10.1] Connecting to remote server 10.10.10.1 failed with the following error message : The WinRM client received an HTTP status code of 403 from the remote WS-Management service. For more information, see the about_Remote_Troubleshooting Help topic.  
> \+ CategoryInfo : OpenError: (10.10.10.1:String) [], PSRemotingTransportException  
> \+ FullyQualifiedErrorId : -2144108273,PSSessionStateBroken

This one was new for me so I jumped to google and started searching for this error message. Unfortunately all the references I found are to solve an IIS problem with SSL checkbox on the website like [this example](https://secure.tkfast.com/faqs_view.php?id=162).
Clearly this is not the problem I was having.

### Proxies

I jumped into PowerShell slack [you can ask for an invite here](http://slack.poshcode.org/) and join more than 3 thousand professionals and ask for help on #powershell-help channel.
In the meantime, I continued my search and found something to do with proxies in the [The dreaded 403 PowerShell Remoting](http://thedevopsdudes.blogspot.pt/2017/08/the-dreaded-403-powershell-remoting.html) blog post.
This actually could help, but I don't want to remove the existing proxies from the remote machine. I had to find another way to do it.
Returning to Slack, Josh Duffney ([b](http://duffney.io/) \| [t](https://twitter.com/joshduffney)) and Daniel Silva ([b](https://danielssilva.dev/) \| [t](https://twitter.com/DanielSilv9)) quickly prompted to help me and when I mentioned the blog post on proxies, Daniel has shown to me the [PowerTip PowerShell Remoting and HTTP 403 Error](http://community.idera.com/powershell/powertips/b/tips/posts/powershell-remoting-and-http-403-error) that I haven't found before (don't ask me why...well, I have an idea, I copy &amp; paste the whole error message that's why).

#### ProxyAccessType

The answer, for my scenario, is the [ProxyAccessType](https://msdn.microsoft.com/en-us/library/system.management.automation.remoting.proxyaccesstype(v=vs.85).aspx) parameter. As it says on the help page, this option "defines the access type for the proxy connection". There are 5 different options `AutoDetect`, `IEConfig`, `None`, `NoProxyServer` and `WinHttpConfig`.
I need to use `NoProxyServer` to "do not use a proxy server - resolves all host names locally". Here is the full code:

``` powershell
$DestinationComputer = '10.10.10.1'
$option = New-PSSessionOption -ProxyAccessType NoProxyServer
Invoke-Command -ScriptBlock { Get-Service *sql* } -ComputerName $DestinationComputer -Credential domain2\user1 -SessionOption $option
```

This will:

* create a new PowerShell Session option (line 2) with `New-PSSessionOption` cmdlet saying that `-ProxyAccessType` is `NoProxyServer`.
* Then, just use the `$option` as the value of `-SessionOption` parameter on the `Invoke-Command`.

This did the trick! Finally I was able to run code on the remote host.
Thanks for reading.
