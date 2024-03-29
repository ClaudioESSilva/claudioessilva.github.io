---
author: claudiosilva
comments: true
date: "2017-09-07T00:00:00Z"
tags:
- CIM
- dbatools
- Different Domains
- Monitoring
- PowerShell
- Remoting
- SQLServer
- syndicated
- WMI
title: '''Invalid class [0x80041010]'' error when trying to access SQLServer''s WMI
  classes'
---
I was using open source PowerShell module [dbatools](http://dbatools.io) ([GitHub repository](https://github.com/sqlcollaborative/dbatools)) to get the list of SQL Server services I have on a bunch of hosts so I could confirm if they are in "*running*" state.

-- Quick note --
For those who don’t know, dbatools is a module, written by the community, that makes SQL Server administration much easier using PowerShell. Today, the module has more than 260 commands. Go get it and try it! If you have any doubt you can join the team on the #dbatools channel at the [Slack - SQL Server Community](http://dbatools.io/slack).
-- Quick note --

To accomplish this, I'm using the [Get-DbaSqlService](https://dbatools.io/functions/get-dbasqlservice/) initially written by Klaas Vandenberghe ([b](https://powerdba.eu/)).

This command is very handy, as it will try different ways to connect to the host and we don't need to do anything extra. Also, it has a `-Credential` parameter so we can use it to connect to hosts in different domains (I have 10 different credentials, one per domain).

## Everything was running fine, for the first couple of hosts, until...

I got the following message when running on a specific host:

>WARNING: Get-DbaSqlService - No ComputerManagement Namespace on HOST001. Please note that this function is available from SQL 2005 up.

![warning_get-dbasqlservice_2005](/img/2017/09/warning_get-dbasqlservice_2005.png)

Trying to get more information, I have executed the same command but added the `-Verbose` switch

From all the blue lines, I spotted this:

>VERBOSE: [Get-DbaCmObject][12:23:31] [HOST001] Retrieving Management Information
>VERBOSE: [Get-DbaCmObject][12:23:31] [HOST001] Accessing computer using Cim over WinRM
>VERBOSE: [Get-DbaCmObject][12:23:47] [HOST001] **Accessing computer using Cim over WinRM - Failed!**
>VERBOSE: [Get-DbaCmObject][12:23:47] [HOST001] Accessing computer using Cim over DCOM
>VERBOSE: [Get-DbaCmObject][12:23:48] [HOST001] **Accessing computer using Cim over DCOM - Success!**

Ok, this means that for this specific host I can't connect via WinRM (using WSMan) but I can when using the DCOM protocol. However,  the WMI query used to get the list of SQL services fails.

### Going further

I open the [Get-DbaSqlService.ps1](https://github.com/sqlcollaborative/dbatools/blob/master/functions/Get-DbaSqlService.ps1) script and spotted where the warning message comes from. Then, I have copied the code to a new window in order to isolate it and do another execution tests.

The code is:

``` powershell
$sessionoption = New-CimSessionOption -Protocol DCOM
$CIMsession = New-CimSession -ComputerName $Computer -SessionOption $sessionoption -ErrorAction SilentlyContinue -Credential $Credential

#I have skipped an if ( $CIMSession ) that is here because we know that works.

$namespace = Get-CimInstance -CimSession $CIMsession -NameSpace root\Microsoft\SQLServer -ClassName "__NAMESPACE" -Filter "Name Like 'ComputerManagement%'" -ErrorAction SilentlyContinue |Where-Object {(Get-CimInstance -CimSession $CIMsession -Namespace $("root\Microsoft\SQLServer\" + $_.Name) -Query "SELECT * FROM SqlService" -ErrorAction SilentlyContinue).count -gt 0}
```

I splitted the last command to remove the pipeline since I would like to analyze each part of the code. I ended with the following code:

``` powershell
$sessionoption = New-CimSessionOption -Protocol DCOM
$CIMsession = New-CimSession -ComputerName "HOST001" -SessionOption $sessionoption -ErrorAction Continue -Credential $Credentials -Verbose

Get-CimInstance -CimSession $CIMsession -NameSpace root\Microsoft\SQLServer -Query "Select * FROM __NAMESPACE WHERE Name Like 'ComputerManagement%'"

#This one is comment for now
#Get-CimInstance -CimSession $CIMsession -Namespace $("root\Microsoft\SQLServer\ComputerManagement10") -Query "SELECT * FROM SqlService"
```

![output_select__namespace_computermanagement1](/img/2017/09/output_select__namespace_computermanagement1.png?w=656)

This can return more than one line with different ComputerManagement (like ComputerManagement10). It depends on the versions you have installed on the host. The number "10" refers to the SQL Server 2008.
Now I can uncomment the last command and run it. The result is:

>Get-CimInstance : **Invalid class**
>At line:1 char:1
>\+ Get-CimInstance -CimSession $CIMsession -Namespace $("root\Microsoft\SQLServer\C ...  
>\+ \~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  
>\+ CategoryInfo : MetadataError: (:) [Get-CimInstance], CimException  
>\+ FullyQualifiedErrorId : HRESULT 0x80041010,Microsoft.Management.Infrastructure.CimCmdlets.GetCimInstanceCommand  
>\+ PSComputerName : HOST001

Ok, a different error message. Let's dig in it. I logged in on the host and confirmed that I have a SQL Server 2008 R2 instance installed. This means that I'm not accessing a lower version than 2005 like the initial warning message was suggesting.

I tried to execute locally the same query but this time using `Get-WmiObject` instead of `Get-CimInstance` (which, in this case wasn't available because the host only have PowerShell v2.0. It's a Windows server 2008 SP2. CIM cmdlets appears on v3.0) and it failed with the same error.

>Get-WmiObject : **Invalid class**
>At line:1 char:5
>\+ gwmi \<\<\<\< -Namespace "root\Microsoft\SQLServer\ComputerManagement10" -Query "SELECT * FROM SqlService"  
>\+ CategoryInfo : InvalidOperation: (:) [Get-WmiObject], ManagementException  
>\+ FullyQualifiedErrorId : GetWMIManagementException,Microsoft.PowerShell.Commands.GetWmiObjectCommand

I remembered, from past experiences, that SQL Server Configuration manager relies on WMI classes to show the information, so I tried to open it and I got the following error message:
[sqlserverconfigurationmanager_invalidclass_error](https://claudioessilva.github.io/img/2017/09/sqlserverconfigurationmanager_invalidclass_error.png)

>Cannot connect to WMI provider. You do not have permission or the server in unreachable. Note that you can only manage SQL Server 2005 and later servers with SQL Server Configuration Manager.
**Invalid class [0x80041010]**

Again, that 2005 callout, but...did you recognize the last sentence? It's the same error I was getting with Get-CIMInstance remotely and Get-WmiObject locally.

Definitely something is broken.

## "Let's fix it!"

To fix this problem we need to reinstall the SQL Server WMI provider. To do this we need to run 2 commands. (I found this in [this post](http://www.chongchonggou.com/g_852406064.html))

* Install classes:
Go to *C:\Program Files (x86)\Microsoft SQL Server\{Version 110 is SQL2012}\Shared*
There you can find a file with *mof* extension. The file name *sqlmgmproviderxpsp2up.mof*
Now on the command line run the following command:
**mofcomp sqlmgmproviderxpsp2up.mof**
The output:
![output_mofcomp_mof](/img/2017/09/output_mofcomp_mof.png)</li>

* Install localization info:
Navigate to the Shared sub-folder that indicates the locale of your SQL Server installation. In my case is the 1033 (english-US).
Inside that folder you will find a file with the *.mfl* extension. The file name is *sqlmgmprovider.mfl.* On the command line run the following command:
**mofcomp sqlmgmprovider.mfl**
The output:
![output_mofcomp_mfl](/img/2017/09/output_mofcomp_mfl.png)</li>

With these 2 actions, we are done.

Now we can try to open the SQL Server Configuration Manager again and it opens like expected! Without error messages.

Let's go back and rerun our commands.
On the host:
![output_gwmi_locally_ok](/img/2017/09/output_gwmi_locally_ok.png?w=656)

Remotely:
![output_getciminstance_remotely_ok](/img/2017/09/output_getciminstance_remotely_ok.png?w=656)

And from dbatools Get-DbaSqlService command:
![output_get-dbasqlservice_ok](/img/2017/09/output_get-dbasqlservice_ok.png?w=656)

No more "invalid class" messages and we get the output we want!

Thanks for reading.
