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
title: HTTP 403 error - PowerShell Remoting, Different Domains and Proxies
---
<p style="text-align:justify;">On my day to day work I use <a href="https://www.nagios.org/" target="_blank" rel="noopener">Nagios</a> monitoring software. I want to add some custom SQL Server scripts to enrich the monitoring, and to accomplish this I will need to:</p>

<ul style="text-align:justify;">
	<li>Find a folder</li>
	<li>Create a sub folder</li>
	<li>Copy bunch of file</li>
	<li>edit a ini file to verify/add new entries</li>
</ul>
<p style="text-align:justify;">all of this for every single host on my entire estate. Obviously (for me :-) ) I decided to use PowerShell!</p>

<h2 style="text-align:justify;">Hold your horses!</h2>
<p style="text-align:justify;">Yes, calm down. I'm working on a client where the network it's anything but simple. As far as I know they have 10 domains and few of them have trust configured, but even those that have, is not in both ways... so I didn't expect an easy journey to get the task done.</p>
<p style="text-align:justify;">Side note: For those thinking how I can live without PowerShell, I can't! But,  the majority of my time using PowerShell is with SQL Server, mainly using SMO (with the help of <a href="https://dbatools.io" target="_blank" rel="noopener">dbatools</a>), which means I haven't struggle that much until now.</p>

<h2 style="text-align:justify;">"...WinRM client received an HTTP status code of 403..."</h2>
<p style="text-align:justify;">Ok, here we go!</p>

<h3 style="text-align:justify;">PowerShell Remoting and different domains...</h3>
<p style="text-align:justify;">....needs different credentials. This is a requirement when using ip address.
If we try to run the following code:</p>
``` powershell
$DestinationComputer = '10.10.10.1'
Invoke-Command -ScriptBlock { Get-Service *sql* } -ComputerName $DestinationComputer
```
<p style="text-align:justify;">we will get the following error message:</p>

<blockquote><span style="color:#ff0000;"><em>Default authentication may be used with an IP address under the following conditions: the transport is HTTPS or the destination is in the TrustedHosts list, and explicit credentials are provided.</em></span></blockquote>
<p style="text-align:justify;">First, I add the destination computer to my TrustedHosts. We can do this in two ways:</p>
<p style="text-align:justify;">Using Set-Item PowerShell cmdlet</p>
``` powershell
Set-Item WSMan:\localhost\Client\TrustedHosts "10.10.10.1"
```
<p style="text-align:justify;">Or using `winrm` executable:</p>
``` powershell
winrm s winrm/config/client '@{TrustedHosts="10.10.10.1"}'
```
<p style="text-align:justify;">Note: You can use "*" (asterisk) to say all remote hosts are trusted. Or just a segment of IPs like "10.10.10.*".</p>
<p style="text-align:justify;">But, there is another requirement like the error message says "...and explicit credentials are provided.". This means that we need to add, and in this case I really want to use, a different credential so I have modified the script to:</p>
``` powershell
$DestinationComputer = '10.10.10.1'
Invoke-Command -ScriptBlock { Get-Service *sql* } -ComputerName $DestinationComputer -Credential domain2\user1
```
<p style="text-align:justify;">Now I get prompted for the user password and I can... get a different error message (*sigh*):</p>

<blockquote><span style="color:#ff0000;"><em>[10.10.10.1] Connecting to remote server 10.10.10.1 failed with the following error message : The WinRM client received an HTTP status code of 403 from the remote WS-Management service. For more information, see the </em></span>

<span style="color:#ff0000;"><em>about_Remote_Troubleshooting Help topic.</em></span>

<span style="color:#ff0000;"><em> + CategoryInfo : OpenError: (10.10.10.1:String) [], PSRemotingTransportException</em></span>

<span style="color:#ff0000;"><em> + FullyQualifiedErrorId : -2144108273,PSSessionStateBroken</em></span></blockquote>
<p style="text-align:justify;">This one was new for me so I jumped to google and started searching for this error message. Unfortunately all the references I found are to solve an IIS problem with SSL checkbox on the website like <a href="https://secure.tkfast.com/faqs_view.php?id=162" target="_blank" rel="noopener">this example</a>.</p>
<p style="text-align:justify;">Clearly this is not the problem I was having.</p>

<h3 style="text-align:justify;">Proxies</h3>
<p style="text-align:justify;">I jumped into PowerShell slack (<a href="http://slack.poshcode.org/" target="_blank" rel="noopener">you can ask for an invite here</a> and join more than 3 thousand professionals) and ask for help on #powershell-help channel.
In the meantime, I continued my search and found something to do with proxies in the <a href="http://thedevopsdudes.blogspot.pt/2017/08/the-dreaded-403-powershell-remoting.html" target="_blank" rel="noopener">The dreaded 403 PowerShell Remoting</a> blog post.
This actually could help, but I don't want to remove the existing proxies from the remote machine. I had to find another way to do it.</p>
<p style="text-align:justify;">Returning to Slack, Josh Duffney (<a href="http://duffney.io/" target="_blank" rel="noopener">b</a> \| <a href="https://twitter.com/joshduffney" target="_blank" rel="noopener">t</a>) and Daniel Silva (<a href="https://danielsknowledgebase.wordpress.com/" target="_blank" rel="noopener">b</a> \| <a href="https://twitter.com/DanielSilv9" target="_blank" rel="noopener">t</a>) quickly prompted to help me and when I mentioned the blog post on proxies, Daniel has shown to me the <a href="http://community.idera.com/powershell/powertips/b/tips/posts/powershell-remoting-and-http-403-error" target="_blank" rel="noopener">PowerTip PowerShell Remoting and HTTP 403 Error</a> that I haven't found before (don't ask me why...well, I have an idea, I copy &amp; paste the whole error message that's why).</p>

<h4 style="text-align:justify;">ProxyAccessType</h4>
<p style="text-align:justify;">The answer, for my scenario, is the <a href="https://msdn.microsoft.com/en-us/library/system.management.automation.remoting.proxyaccesstype(v=vs.85).aspx" target="_blank" rel="noopener">ProxyAccessType</a> parameter. As it says on the help page, this option "defines the access type for the proxy connection". There are 5 different options `AutoDetect`, `IEConfig`, `None`, `NoProxyServer` and `WinHttpConfig`.</p>
<p style="text-align:justify;">I need to use `NoProxyServer` to "do not use a proxy server - resolves all host names locally". Here is the full code:</p>
``` powershell
$DestinationComputer = '10.10.10.1'
$option = New-PSSessionOption -ProxyAccessType NoProxyServer
Invoke-Command -ScriptBlock { Get-Service *sql* } -ComputerName $DestinationComputer -Credential domain2\user1 -SessionOption $option
```
<p style="text-align:justify;">This will:</p>

<ul style="text-align:justify;">
	<li>create a new PowerShell Session option (line 2) with `New-PSSessionOption` cmdlet saying that `-ProxyAccessType` is `NoProxyServer`.</li>
	<li>Then, just use the `$option` as the value of `-SessionOption` parameter on the `Invoke-Command`.</li>
</ul>
<p style="text-align:justify;">This did the trick! Finally I was able to run code on the remote host.</p>
<p style="text-align:justify;">Thanks for reading.</p>
