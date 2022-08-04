---
author: claudiosilva
comments: true
date: "2018-01-23T00:00:00Z"
tags:
- Compliance
- dbatools
- PowerShell
- SQLServer
- syndicated
- Test-DbaSqlBuild
title: Using dbatools to verify your SQL Server instances version compliance
---
One of the main DBA's duties is to guarantee that SQL Server instances are up-to-date in terms of patches (Service Packs, Cumulative Updates or Security Updates).

Recently, dbatools added a new command that turns this validation a piece of cake. Thanks to Simone Bizzotto (@niphlod) for baking up the command that <a href="https://twitter.com/wsmelton" rel="noopener" target="_blank">Shawn Melton</a> (@wsmelton) and I initially requested.

Some dbatools users already expressed their happiness with the command, like <a href="https://twitter.com/jpomfret" rel="noopener" target="_blank">Jess Pomfret</a>
https://twitter.com/jpomfret/status/954018103507251201

So, I thought that this information should be shared with other people too.

## Let me introduce to you - Test-DbaSqlBuild

This new command is available since v0.9.150.

If you are running this version or higher you can already take advantage of it, otherwise, you need to upgrade your module version first. Assuming you have installed the module from the PowerShell Gallery and that you have internet access, you can update as easy as running the following command:
``` powershell
Update-Module dbatools -Force
```
Otherwise, you can use the `Save-Module` command and then copy the files to your destination host.

## How does the command works?

This command uses the `dbatools-buildref-index.json` file that contains all the information about SQL Server builds. This is the same file that feeds the <a href="https://sqlcollaborative.github.io/builds" rel="noopener" target="_blank">dbatools builds table</a> already shown on the <a href="https://dbatools.io/buildref/" rel="noopener" target="_blank">introducing the community-driven build reference</a> blog post.

### The combinations

To run the command, we need at least two parameters. The `-SqlInstance` or `-Build` and one of the following 3: `-MinimumBuild`, `-MaxBehind` or `-Latest`.

The most straight example is when you want to check if the instance is running the latest build (it can be a security update even if not labelled as CU). To do that you just need to run:
``` powershell
Test-DbaSqlBuild -SqlInstance <instance> -Latest
```

<a href="https://claudioessilva.github.io/img/2018/01/latestexample.png"><img src="https://claudioessilva.github.io/img/2018/01/latestexample.png?w=656" alt="" width="656" height="231" class="aligncenter size-large wp-image-1185" /></a>

In this example, I'm testing an instance that I have patched with SQL Server 2012 to SP4 but after that, the new security fix for Meltdown/Spectre was released, that is why the Compliant property shows `False`, it is not on the Latest existing build.
Note: If you just want to check for the latest SP and CU (leaving out the security patches) you need to use `-MaxBehind "0CU"`

Now, let's say that you want to confirm that a specific instance is no more than 1 CU behind.
It's easy as:
``` powershell
Test-DbaSqlBuild -SqlInstance <instance> -MaxBehind "1CU"
```

The output:
<a href="https://claudioessilva.github.io/img/2018/01/online_maxbehind_1cu.png"><img src="https://claudioessilva.github.io/img/2018/01/online_maxbehind_1cu.png?w=656" alt="" width="656" height="234" class="aligncenter size-large wp-image-1173" /></a>

In this example, you can see that this instance is not compliant. Why? Because it is running the SQL Server 2016 SP1 CU5 but we asked for a max behind of 1 CU and that is the SP1 CU6 (because at the moment I'm writing this text, the most recent version is SP1 CU7).

Easy, right?
Keep in mind that for `-MaxBehind` you can also specify the number of service packs using `-MaxBehind "1SP"` and even use both, SP and CU like `-MaxBehind "1SP 1CU"`.
Now, you can use multiple instances and verify them all like:

``` powershell
$SQLInstances = "SQL1", "SQL2", "SQL3"
Test-DbaSqlBuild -SqlInstance $SQLInstances -MaxBehind "1SP"
```

## Other (real and useful) scenarios

We saw the "online" example where we will query each instance at the moment. Now, I want to share with you two more examples.

#### Using central database as data source

Let's say you have a central database where you keep some of the information about your estate and one of those pieces of information is the SQL Server build version.

One code example:
``` powershell
$Instance = "<instance>"
$Database = "<centralDatabase>"
$InstancesTable = "dbo.Instances"
$SQLServersBuilds = Invoke-DbaSqlcmd -ServerInstance $Instance -Database $Database -Query "SELECT serverName, productVersion FROM $InstancesTable"
$SQLServersBuilds | ForEach-Object {
    $build = $_.ProductVersion.SubString(0, $_.ProductVersion.LastIndexOf('.'))
    $serverName = $_.ServerName
    Test-DbaSqlBuild -Build $build -MaxBehind "1CU" | Select-Object @{Name="ServerName";Expression={$serverName}}, *
} | Out-GridView
```

For this example, I will query my `dbo.Instances` table and get the `serverName` and `productVersion` columns.
This is how it looks when running the select statement on SSMS:
<a href="https://claudioessilva.github.io/img/2018/01/sqloutput_servername_productversion.png"><img src="https://claudioessilva.github.io/img/2018/01/sqloutput_servername_productversion.png" alt="" width="229" height="212" class="aligncenter size-full wp-image-1174" /></a>
You can pick that data and pass it to the `Test-DbaSqlBuild` command to know if it is compliant or not.

Then for each result, we will format the `productVersion` value to use just a 3 part value (it is how we catalog on dbatools build reference file) and pass it to the `Test-DbaSqlBuild` command.
In this example, I'm piping the output to `Out-GridView` so I can filter my results and add a filter for `compliant equals false`
<a href="https://claudioessilva.github.io/img/2018/01/centraldatabase_ogv.png"><img src="https://claudioessilva.github.io/img/2018/01/centraldatabase_ogv.png?w=656" alt="" width="656" height="159" class="aligncenter size-large wp-image-1172" /></a>.
<br>

#### Doing ad-hoc testing

The other example I would like to share is using the `-Build` parameter.
Imagine that you know that your SQL server instance is running build "13.0.4001" corresponding to SQL Server 2016 SP1, and you want to know if it is too far behind compared with the last available CU update. If we run the following command we will know it:

``` powershell
Test-DbaSqlBuild -Build "13.0.4001" -MaxBehind "0CU"
```

<a href="https://claudioessilva.github.io/img/2018/01/test_buildmaxbehind0cu.png"><img src="https://claudioessilva.github.io/img/2018/01/test_buildmaxbehind0cu.png" alt="" width="616" height="234" class="aligncenter size-full wp-image-1175" /></a>

From this output we know that the most recent version is SP1 CU7 and we asked for latest SP1 (without CU), this means we <strong>are not</strong> `Compliant`

To give another example of this "ad-hoc" testing, we can use the following code provided by Simone Bizzotto to verify if our instances have the Meltdown/Spectre fix in place:

``` powershell
#Meltdown/Spectre check:
$mapping = @{
    '2008'   = '10.0.6556'
    '2008R2' = '10.50.6560'
    '2012'   = '11.0.7462'
    '2014'   = '12.0.5571'
    '2016'   = '13.0.4466'
    '2017'   = '14.0.3015'
}
$serv = 'SQL01','SQL02'
foreach($ref in (Get-DbaSqlBuildReference -SqlInstance $serv)) {
    Test-DbaSqlBuild -SqlInstance $ref.SqlInstance -MinimumBuild $mapping[$ref.NameLevel]
}
```

Thanks for reading.
