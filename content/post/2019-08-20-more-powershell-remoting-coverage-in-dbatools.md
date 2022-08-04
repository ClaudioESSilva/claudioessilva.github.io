---
author: claudiosilva
comments: true
date: "2019-08-20T00:00:00Z"
tags:
- dbatools
- PowerShell
- Remoting
- SQLServer
- syndicated
title: More PowerShell Remoting coverage in dbatools
---
Starting on dbatools version 1.0.31 we introduced better coverage for commands that make use of PowerShell Remoting.

<h2>Which commands?</h2>

Commands like `Get-DbaComputerCertificate`, `Get-DbaPrivilege`, `Get-DbaClientAlias`, just to mention a few of them, make use of the internal function `Invoke-Command2` which uses `New-PSSession` when we run it against a remote computer.

<h2>"Why have you changed it?"</h2>

Let me give you a little bit of background...
At my company, I found that some dbatools commands were not working. They were returning errors related with WinRM configurations, as seen here when attempting to create a new session using `New-PSSession`:<img class="aligncenter size-large wp-image-1824" src="https://claudioessilva.github.io/img/2019/08/new-pssession_error.png?w=800" alt="" width="800" height="153">

Or even trying to use the `Invoke-Command` directly<img class="aligncenter size-large wp-image-1823" src="https://claudioessilva.github.io/img/2019/08/invoke-command_error.png?w=800" alt="" width="800" height="107">

I wondered why and asked the Windows team if they could provide any insight. A colleague explained to me that I needed to change three things to make my remoting commands work on our network:

<ol>
<li>Use the FQDN on `-ComputerName` and/or `-SqlInstance` parameters</li>
<li>Use `-UseSSL` parameter on the `New-PSSession` command</li>
<li>Use `-IncludePortInSPN` parameter for the `New-PsSessionOption` command</li>
</ol>

And <em>voilà</em> with these settings in place it worked like a charm!<img class="aligncenter size-large wp-image-1767" src="https://claudioessilva.github.io/img/2019/08/psremoting_working.png?w=800" alt="" width="800" height="164">

NOTE: Currently, in my environment if I respect the points 1 and 2 it's ok. However, by reading the documentation about `-IncludePortInSPN` I understand why it may be needed.

<blockquote>...
The option is designed for enterprises where multiple services that support Kerberos authentication are running under different user accounts. For example, an IIS application that allows for Kerberos authentication can require the default SPN to be registered to a user account that differs from the computer account. In such cases, PowerShell remoting cannot use Kerberos to authenticate because it requires an SPN that is registered to the computer account. To resolve this problem, administrators can create different SPNs, such as by using Setspn.exe, that are registered to different user accounts and can distinguish between them by including the port number in the SPN.</blockquote>

<h2>Time to make this available to everyone!</h2>

Let's add this as a configurable settings on dbatools module itself!

<h3>"Nice! Can you share what you have changed in the module?"</h3>

Sure I can!
The improvements that we have added to dbatools covers the points 2 and 3. (point 1 just depends on the way you use the name, so this one is already covered by default as it is today)

If you are not aware of it, dbatools has some wide configurations itself. From sqlconnection, through logging and caching, remoting and others.
Thanks to Fred Weinmann ([b](http://allthingspowershell.blogspot.com/) \| [t](https://twitter.com/FredWeinmann)) (our infrastructure code wizard) and his [PSFramework](http://psframework.org/) module is used to manage configurations, logging and others, we can use the `Set-DbatoolsConfig` to change these values.

If you are asking which values, I encourage you to use the `Get-DbaToolsConfig` to have an overview of them. You will find some neat stuff! To know more about these configurations, read my post on dbatools blog named [dbatools advanced configuration](https://dbatools.io/configuration).

Back to our scenario...
We have added two new configs, `PSRemoting.PsSessionOption.IncludePortInSPN` and `PSRemoting.PsSession.UseSSL` in the [remoting.ps1](https://github.com/sqlcollaborative/dbatools/blob/development/internal/configurations/settings/remoting.ps1) file available in the configuration folder. This configurations are loaded when you import the module. If, you have any setting registered (using `Register-DbatoolsConfig`) nothing will be overwritten. In this case, your current registered values are preserved and will be used in your current session.

Within `Invoke-Command2` we have changed the code to use this variable with the configured values.<img class="aligncenter size-large wp-image-1768" src="https://claudioessilva.github.io/img/2019/08/psremoting_addedcode.png?w=800" alt="" width="800" height="260">

Now we can import our module and test the changes. But first we need to set these new configurations to the desired values. In my scenario, set both values to `$true`
``` powershell
Set-DbaToolsConfig -Name 'psremoting.pssession.usessl' -Value $true
Set-DbaToolsConfig -Name 'psremoting.pssessionoption.includeportinspn' -Value $true
```
Then we can use a dbatools command that previous was failing and check that now, it works!
``` powershell
Get-DbaComputerCertificate -ComputerName "hostname.domain"
```<img class="aligncenter size-large wp-image-1771" src="https://claudioessilva.github.io/img/2019/08/get-dbacomputercertificate_working.png?w=800" alt="" width="800" height="140">

This way I can set the configuration value to what value I want and next time I execute the command, it will make use of it!
Note: remember these settings are on a user scope basis. Which means that if you have a service account running dbatools commands, you will want to add the `Set-DbatoolsConfig` code at the beginning of your scripts to make sure that it will use the settings with the values that you need.

<h2>The before and the after</h2>

Before the change, I got these errors:

<ul>
<li>Just setting `-UseSSL` to `$true`
As said before, in my case it works. (No picture here :-))</p></li>
<li><p>When specifying `$false` for both options and with or without FQDN</p></li>
</ul>

<blockquote>WARNING: [HH:mm:ss][Get-DbaComputerCertificate] Issue connecting to computer | Connecting to remote server "ComputerName" failed with the following error message : The client cannot connect to the destination specified in the request. Verify that the service on the destination is running and is accepting requests. Consult the logs and documentation for the WS-Management service running on the destination, most commonly IIS or WinRM. If the destination is the WinRM service, run the following command on the destination to analyze and configure the WinRM service: "winrm quickconfig". For more information, see the about_Remote_Troubleshooting Help topic.</blockquote>

<p><img class="aligncenter size-large wp-image-1779" src="https://claudioessilva.github.io/img/2019/08/test_failing_nosettings.png?w=800" alt="" width="800" height="81">

<ul>
<li>Just setting `-IncludePortInSPN` to `$true` and with or without FQDN</li>
</ul>

<blockquote>WARNING: [HH:mm:ss][Get-DbaComputerCertificate] Issue connecting to computer | Connecting to remote server "ComputerName" failed with the following error message : WinRM cannot process the request. The following error occurred while using Kerberos authentication: Cannot find the computer "ComputerName". Verify that the computer exists on the network and that the name provided is spelled correctly. For more information, see the about_Remote_Troubleshooting Help topic.</blockquote>

<img class="aligncenter size-large wp-image-1774" src="https://claudioessilva.github.io/img/2019/08/test_failing_includeportinspn.png?w=800" alt="" width="800" height="71">

<ul>
<li>Using both but with no FQDN</li>
</ul>

<blockquote>WARNING: [HH:mm:ss][Get-DbaComputerCertificate] Issue connecting to computer | Connecting to remote server "ComputerName" failed with the following error message : The server certificate on the destination computer ("ComputerName":5986) has the following errors:
The SSL certificate contains a common name (CN) that does not match the hostname. For more information, see the about_Remote_Troubleshooting Help topic.</blockquote>

<img class="aligncenter size-large wp-image-1773" src="https://claudioessilva.github.io/img/2019/08/test_failing_bothtrue_notfqdn.png?w=800" alt="" width="800" height="70">

After I set these two values using the `Set-DbatoolsConfig` and using the FQDN it worked perfectly!

<h1>Wrap up</h1>

You should talk with the team that manages how your network/SPNs are configured and which parameters/values you need to be using to take advantage of PowerShell Remoting successfully. Now you can go to dbatools and set the values you need to use the commands natively!

Note: if you found that some parameters you need are not available to be configurable yet, let us know by opening an issue on the GitHub repository.

Thanks for reading!
