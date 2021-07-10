---
layout: post
title: Export Deadlocks to file from system_health Extended Event using PowerShell
date: 2020-05-25 13:50
author: claudiosilva
comments: true
tags: [Automation, dbatools, deadlocks, extended events, Monitoring, performance, PowerShell, Scripting, SQLServer, syndicated, system_health]
---
Just a quick post as may help any of you searching for this.

<h2>Scenario</h2>

Client wants to analyze most recent deadlocks that happened on a specific instance. They asked us to send the xdl files.

<h2>How do we get the deadlocks?</h2>

Depending on the version of SQL Server that you are running, there are different ways to do it.
In this post I will share how you can do it from all files that belongs to the `system_health` extended event session. (Not only the current file).
This works on SQL Server 2012 or higher version.
For a better overview I recommend you to read the <a href="https://www.sqlshack.com/what-are-sql-server-deadlocks-and-how-to-monitor-them/">What are SQL Server deadlocks and how to monitor them</a> article from SQLShack.

<h2>T-SQL query to get the deadlocks entries</h2>

This query will show you when the deadlock happened (datetime) and the XML of the deadlock.

The only thing you need to know is the path where the `system_health` extended event is saving the results. By default is the SQL Server log folder.
Example: `\MSSQLXX.MSSQLSERVER2\MSSQL\Log`
You can use, for example, the following query to get the `ErrorLog` file path:
``` sql
SELECT SERVERPROPERTY('ErrorLogFileName')
```

If you remove the final `\ERRORLOG` part, you have the folder.

The T-SQL code can be like this:
``` sql
DECLARE @LogPath NVARCHAR(255) = (SELECT CAST(SERVERPROPERTY('ErrorLogFileName') AS NVARCHAR(255)))
SET @LogPath = SUBSTRING(@LogPath, 1, charindex('\ERRORLOG', @LogPath) - 1)

SELECT
	CONVERT(xml, event_data).query('/event/data/value/child::*') as deadlock,
	CONVERT(xml, event_data).value('(event[@name=&quot;xml_deadlock_report&quot;]/@timestamp)[1]','datetime') AS Execution_Time
FROM sys.fn_xe_file_target_read_file(@LogPath + '\system_health*.xel', null, null, null)
WHERE object_name like 'xml_deadlock_report'
```
</br>

<h3>Using PowerShell to save the files to the filesystem</h3>

Now that we have the T-SQL to get the data, we just need to save it on some folder.
Each outputted file name have a name like `deadlock_{Execution_Time}.xdl`.

Before running the script, you need to change:
Line 1 - The SQL instance you want to query
Line 2 - The path where the files will be saved. (This folder will be created if doesn't exists)

NOTE: The script is making use of `SqlServer` PowerShell module (line 15). However, if you prefer, you can use dbatools (uncomment line 18 and comment line 15).
NOTE2: The time that will take to execute the script is directly related with the number of `system_health` files and their sizes.

``` powershell
$instance = &quot;myInstance&quot;
$outputDirectory = &quot;D:\Deadlocks&quot;
$query = @&quot;
DECLARE @LogPath NVARCHAR(255) = (SELECT CAST(SERVERPROPERTY('ErrorLogFileName') AS NVARCHAR(255)))
SET @LogPath = SUBSTRING(@LogPath, 1, charindex('\ERRORLOG', @LogPath) - 1)

SELECT
	CONVERT(xml, event_data).query('/event/data/value/child::*') as deadlock,
	CONVERT(xml, event_data).value('(event[@name=&quot;xml_deadlock_report&quot;]/@timestamp)[1]','datetime') AS Execution_Time
FROM sys.fn_xe_file_target_read_file(@LogPath + '\system_health*.xel', null, null, null)
WHERE object_name like 'xml_deadlock_report'
&quot;@

# With sqlserver module
$results = Invoke-Sqlcmd -ServerInstance $instance -Query $query

# With dbatools module
#$results = Invoke-DbaQuery -SqlInstance $instance -Query $query

# Create a folder to save the files
New-Item -Path $outputDirectory -Type Directory -Force

# Save each XML as xdl file on the filesystem
$results.foreach {
    $_.deadlock | Out-File -FilePath &quot;$outputDirectory\deadlock$($_.Execution_Time.TofileTime()).xdl&quot;
}
```

The output on the folder will be something like:
<img src="https://claudioessilva.github.io/img//2020/05/featureimage_2.png" alt="" width="186" height="240" class="aligncenter size-full wp-image-2020" />

<h2>Bonus step - if you want</h2>

Probably you will share this on a shared folder or even by email. It can be good idea to compress the folder into a zip file.
You can easily do that by running the `Compress-Archive` cmdlet (PowerShell v5+).
``` powershell
Compress-Archive -Path D:\Deadlocks -DestinationPath D:\Deadlocks.zip
```

Thanks for reading.
