---
layout: post
title: "Invalid class [0x80041010]" error when trying to access SQLServer's WMI classes
date: 2017-09-07 13:00
author: claudiosilva
comments: true
tags: [CIM, dbatools, Different Domains, Monitoring, PowerShell, Remoting, SQLServer, syndicated, WMI]
---
I was using open source PowerShell module <a href="http://dbatools.io" target="_blank" rel="noopener">dbatools</a> (<a href="https://github.com/sqlcollaborative/dbatools" target="_blank" rel="noopener">GitHub repository</a>) to get the list of SQL Server services I have on a bunch of hosts so I could confirm if they are in "<em>running</em>" state.

-- Quick note --
For those who don’t know, dbatools is a module, written by the community, that makes SQL Server administration much easier using PowerShell. Today, the module has more than 260 commands. Go get it and try it! If you have any doubt you can join the team on the #dbatools channel at the <a href="http://dbatools.io/slack" target="_blank" rel="noopener">Slack - SQL Server Community</a>.
-- Quick note --

To accomplish this, I'm using the <a href="https://dbatools.io/functions/get-dbasqlservice/" target="_blank" rel="noopener">Get-DbaSqlService</a> initially written by Klaas Vandenberghe (<a href="https://powerdba.eu/" target="_blank" rel="noopener">b</a> \| <a href="https://twitter.com/powerdbaklaas" target="_blank" rel="noopener">t</a>).

This command is very handy, as it will try different ways to connect to the host and we don't need to do anything extra. Also, it has a `-Credential` parameter so we can use it to connect to hosts in different domains (I have 10 different credentials, one per domain).

<h2>Everything was running fine, for the first couple of hosts, until...</h2>

I got the following message when running on a specific host:

<blockquote>WARNING: Get-DbaSqlService - No ComputerManagement Namespace on HOST001. Please note that this function is available from SQL 2005 up.</blockquote>

<a href="https://claudioessilva.github.io/img//2017/09/warning_get-dbasqlservice_2005.png"><img class="aligncenter wp-image-540 size-full" src="https://claudioessilva.github.io/img//2017/09/warning_get-dbasqlservice_2005.png" alt="" width="968" height="25" /></a>

Trying to get more information, I have executed the same command but added the `-Verbose` switch

From all the blue lines, I spotted this:

<blockquote>VERBOSE: [Get-DbaCmObject][12:23:31] [HOST001] Retrieving Management Information
VERBOSE: [Get-DbaCmObject][12:23:31] [HOST001] Accessing computer using Cim over WinRM
VERBOSE: [Get-DbaCmObject][12:23:47] [HOST001] <b>Accessing computer using Cim over WinRM - Failed!</b>
VERBOSE: [Get-DbaCmObject][12:23:47] [HOST001] Accessing computer using Cim over DCOM
VERBOSE: [Get-DbaCmObject][12:23:48] [HOST001]<b> Accessing computer using Cim over DCOM - Success!</b></blockquote>

Ok, this means that for this specific host I can't connect via WinRM (using WSMan) but I can when using the DCOM protocol. However,  the WMI query used to get the list of SQL services fails.

<h3>Going further</h3>

I open the <a href="https://github.com/sqlcollaborative/dbatools/blob/master/functions/Get-DbaSqlService.ps1" target="_blank" rel="noopener">Get-DbaSqlService.ps1</a> script and spotted where the warning message comes from. Then, I have copied the code to a new window in order to isolate it and do another execution tests.

The code is:

``` powershell
$sessionoption = New-CimSessionOption -Protocol DCOM
$CIMsession = New-CimSession -ComputerName $Computer -SessionOption $sessionoption -ErrorAction SilentlyContinue -Credential $Credential
#I have skipped an if ( $CIMSession ) that is here because we know that works.
$namespace = Get-CimInstance -CimSession $CIMsession -NameSpace root\Microsoft\SQLServer -ClassName &quot;__NAMESPACE&quot; -Filter &quot;Name Like 'ComputerManagement%'&quot; -ErrorAction SilentlyContinue |Where-Object {(Get-CimInstance -CimSession $CIMsession -Namespace $(&quot;root\Microsoft\SQLServer\&quot; + $_.Name) -Query &quot;SELECT * FROM SqlService&quot; -ErrorAction SilentlyContinue).count -gt 0}
```

I splitted the last command to remove the pipeline since I would like to analyze each part of the code. I ended with the following code:

``` powershell
$sessionoption = New-CimSessionOption -Protocol DCOM
$CIMsession = New-CimSession -ComputerName &quot;HOST001&quot; -SessionOption $sessionoption -ErrorAction Continue -Credential $Credentials -Verbose

Get-CimInstance -CimSession $CIMsession -NameSpace root\Microsoft\SQLServer -Query &quot;Select * FROM __NAMESPACE WHERE Name Like 'ComputerManagement%'&quot;
#This one is comment for now
#Get-CimInstance -CimSession $CIMsession -Namespace $(&quot;root\Microsoft\SQLServer\ComputerManagement10&quot;) -Query &quot;SELECT * FROM SqlService&quot;
```

<a href="https://claudioessilva.github.io/img//2017/09/output_select__namespace_computermanagement1.png"><img class="aligncenter wp-image-545 size-large" src="https://claudioessilva.github.io/img//2017/09/output_select__namespace_computermanagement1.png?w=656" alt="" width="656" height="44" /></a>

This can return more than one line with different ComputerManagement (like ComputerManagement10). It depends on the versions you have installed on the host. The number "10" refers to the SQL Server 2008.
Now I can uncomment the last command and run it. The result is:

<blockquote>Get-CimInstance : <strong>Invalid class</strong>
At line:1 char:1
+ Get-CimInstance -CimSession $CIMsession -Namespace $("root\Microsoft\SQLServer\C ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
+ CategoryInfo : MetadataError: (:) [Get-CimInstance], CimException
+ FullyQualifiedErrorId : HRESULT 0x80041010,Microsoft.Management.Infrastructure.CimCmdlets.GetCimInstanceCommand
+ PSComputerName : HOST001</blockquote>

Ok, a different error message. Let's dig in it. I logged in on the host and confirmed that I have a SQL Server 2008 R2 instance installed. This means that I'm not accessing a lower version than 2005 like the initial warning message was suggesting.

I tried to execute locally the same query but this time using `Get-WmiObject` instead of `Get-CimInstance` (which, in this case wasn't available because the host only have PowerShell v2.0. It's a Windows server 2008 SP2. CIM cmdlets appears on v3.0) and it failed with the same error.

<blockquote>Get-WmiObject : <strong>Invalid class</strong>
At line:1 char:5
+ gwmi &lt;&lt;&lt;&lt; -Namespace "root\Microsoft\SQLServer\ComputerManagement10" -Query "SELECT * FROM SqlService"
+ CategoryInfo : InvalidOperation: (:) [Get-WmiObject], ManagementException
+ FullyQualifiedErrorId : GetWMIManagementException,Microsoft.PowerShell.Commands.GetWmiObjectCommand</blockquote>

I remembered, from past experiences, that SQL Server Configuration manager relies on WMI classes to show the information, so I tried to open it and I got the following error message:
<img class="size-full wp-image-542 aligncenter" src="https://claudioessilva.github.io/img//2017/09/sqlserverconfigurationmanager_invalidclass_error.png" alt="" width="403" height="171" />

<blockquote>Cannot connect to WMI provider. You do not have permission or the server in unreachable. Note that you can only manage SQL Server 2005 and later servers with SQL Server Configuration Manager.
<strong>Invalid class [0x80041010]</strong></blockquote>

Again, that 2005 callout, but...did you recognize the last sentence? It's the same error I was getting with Get-CIMInstance remotely and Get-WmiObject locally.

Definitely something is broken.

<h2>Let's fix it!</h2>

To fix this problem we need to reinstall the SQL Server WMI provider. To do this we need to run 2 commands. (I found this in <a href="http://www.chongchonggou.com/g_852406064.html" target="_blank" rel="noopener">this post</a>)

<ol>
    <li>Install classes:
Go to <em>C:\Program Files (x86)\Microsoft SQL Server\{Version 110 is SQL2012}\Shared</em>
There you can find a file with <em>mof</em> extension. The file name <em>sqlmgmproviderxpsp2up.mof</em>
Now on the command line run the following command:
<strong>mofcomp sqlmgmproviderxpsp2up.mof</strong>
The output:
<a href="https://claudioessilva.github.io/img//2017/09/output_mofcomp_mof.png"><img class="aligncenter size-full wp-image-546" src="https://claudioessilva.github.io/img//2017/09/output_mofcomp_mof.png" alt="" width="642" height="99" /></a></li>
    <li>Install localization info:
Navigate to the Shared sub-folder that indicates the locale of your SQL Server installation. In my case is the 1033 (english-US).
Inside that folder you will find a file with the <em>.mfl</em> extension. The file name is <em>sqlmgmprovider.mfl.</em><strong> </strong>On the command line run the following command:
<strong>mofcomp sqlmgmprovider.mfl </strong>
The output:
<a href="https://claudioessilva.github.io/img//2017/09/output_mofcomp_mfl.png"><img class="aligncenter size-full wp-image-547" src="https://claudioessilva.github.io/img//2017/09/output_mofcomp_mfl.png" alt="" width="645" height="99" /></a></li>
</ol>

With these 2 actions, we are done.

Now we can try to open the SQL Server Configuration Manager again and it opens like expected! Without error messages.

Let's go back and rerun our commands.
On the host:
<a href="https://claudioessilva.github.io/img//2017/09/output_gwmi_locally_ok.png"><img class="aligncenter size-large wp-image-548" src="https://claudioessilva.github.io/img//2017/09/output_gwmi_locally_ok.png?w=656" alt="" width="656" height="89" /></a>

Remotely:
<a href="https://claudioessilva.github.io/img//2017/09/output_getciminstance_remotely_ok.png"><img class="aligncenter size-large wp-image-549" src="https://claudioessilva.github.io/img//2017/09/output_getciminstance_remotely_ok.png?w=656" alt="" width="656" height="46" /></a>

And from dbatools Get-DbaSqlService command:
<a href="https://claudioessilva.github.io/img//2017/09/output_get-dbasqlservice_ok.png"><img class="aligncenter size-large wp-image-550" src="https://claudioessilva.github.io/img//2017/09/output_get-dbasqlservice_ok.png?w=656" alt="" width="656" height="51" /></a>

No more "invalid class" messages and we get the output we want!

Thanks for reading.
