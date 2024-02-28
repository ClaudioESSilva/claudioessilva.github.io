---
author: claudiosilva
comments: true
date: "2024-02-27T11:00:00Z"
tags:
- AzureSQLDB
- SQLServer
- TSQL
- DBA
- syndicated
title: "Check Azure SQL DB Space Used"
autoThumbnailImage: false
thumbnailImagePosition: top
thumbnailImage: /img/2024/0301/AzureSQLDB-PortalViewDataStorage.png
coverImage: /img/2024/0301/AzureSQLDB-PortalViewDataStorage.png
metaAlignment: center
coverMeta: out
draft: true
---

A couple of days ago I was doing some cleaning on some Azure SQL DBs and shrinking some files to lower the bill.  
To check my progress I needed to check the size before/after the task in an easy way for multiple Azure SQL DBs.  

## Check Azure SQL DB storage space for 1 database
If you need to check the storage space being used by 1 Azure SQL DB, that is as easy as jumping on the portal, select the desired database and you can find the information.

[![Portal View](/img/2024/0301/AzureSQLDB-PortalView.png)](/img/2024/0301/AzureSQLDB-PortalView.png)

<br>

### Using T-SQL
If you prefer to use T-SQL and perhaps you already have SSMS/ADS open and ready to fire a query, despite being an Azure SQL DB, we can still use some old friends as `sp_spaceused`.

[![sp_spaceused](/img/2024/0301/AzureSQLDB-sp_spaceused.png)](/img/2024/0301/AzureSQLDB-sp_spaceused.png)


However, we can't use `sp_helpdb 'BlogDemo'` (running on the context of the `master` database) as it seems it can see the named database we want.

The error message is:
> Msg 15010, Level 16, State 1, Procedure sp_helpdb, Line 45 [Batch Start Line 0]
> The database 'BlogDemo' does not exist. Supply a valid database name. To see available databases, use sys.databases.

Interestingly enough, if we try to run the same command in the context of the user database `BlogDemo` we get a better error message:
> Msg 40515, Level 15, State 1, Procedure sp_helpdb, Line 16 [Batch Start Line 0]
> Reference to database and/or server name in 'master.dbo.sysdatabases' is not supported in this version of SQL Server.

## Getting an overview of all Azure SQL DBs
If you want to check the space being used by multiple databases that belong to the same server using the portal, that won't be so funny.  
You will need to jump from one database to the next one until you grab all the figures you want.

### Using T-SQL
The previous T-SQL method shown just works per database too, meaning you also need to change your connection to grab the information from each database.

However, there is a different way to grab all the information by running a single query against the `master` database using the `sys.resource_stats` [DMV](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-resource-stats-azure-sql-database).

The following code grabs the most recent information per database from the `sys.resource_stats` DMV.

``` SQL
SELECT 
	[database_name],
	start_time AS 'LastCollectionTime', 
	storage_in_megabytes AS 'CurrentSize(MBs)',
	allocated_storage_in_megabytes AS 'AllocatedStorage(MBs)'
  FROM (
			SELECT 
				ROW_NUMBER() OVER(PARTITION BY [database_name] ORDER BY start_time DESC) AS rn,
				[database_name],
				start_time,
                storage_in_megabytes,
                allocated_storage_in_megabytes
			FROM sys.resource_stats 
		) rs 
WHERE rn = 1
```

[![sys.resource_stats](/img/2024/0301/AzureSQLDB-sys_resource_stats_DMV.png)](/img/2024/0301/AzureSQLDB-sys_resource_stats_DMV.png)

As we can see we get a row per database with the information on which time the collection happened, what was the current size and allocated storage in MB.


## Gotchas
If, for example, you have been running some [DBCC SHRINKFILE](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-shrinkfile-transact-sql) and you can't see the new size right away, be aware that the data on the DMV is not real-time.  
As stated in the [documentation](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-resource-stats-azure-sql-database):

> The data is collected and aggregated within five-minute intervals.

Hence, you may need to wait a couple of minutes before you see the new size, that you were expecting after your shrink process finished.

Thanks for reading!