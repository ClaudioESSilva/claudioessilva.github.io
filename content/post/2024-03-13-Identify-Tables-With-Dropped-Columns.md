---
author: claudiosilva
comments: true
date: "2024-06-15T11:00:00Z"
tags:
- SQLServer
- TSQL
- DBA
- Internals
- DBCC PAGE
- system_internals_partition_columns
- drop columns
- syndicated
title: "Identify Tables With Dropped Columns"
autoThumbnailImage: false
thumbnailImagePosition: top
thumbnailImage: /img/2024/0415/GetDroppedColumns_thumbnailImage.png
coverImage: /img/2024/0415/GetDroppedColumns_coverImage.png
metaAlignment: center
coverMeta: out
draft: true
---

On my last article - [What happens when we drop a column on a SQL Server table? Where's my space?](https://www.sqlservercentral.com/articles/what-happens-when-we-drop-a-column-on-a-sql-server-table-wheres-my-space) - I have shown what happens when we drop a column from a table.  
Today, we are going to check if we have a way to find tables with dropped columns.

## Why?
As we learnt, when we drop a column this is just a metadata operation and won’t clear the space that was being used. You may be asking - Do I have more tables with dropped columns that I’m not aware of? - And that is a legit question.  
Let's see how we can achieve this.

## A more complex, resource and time-consuming way
As we saw before we can check if a column was dropped from a table by inspecting a data page that belongs to it.  

This means, that probably we can use that in some way to double-check if that is the case or not for more tables.

### Just text won't be very helpful
One of the examples that I have shown before was a dump of the output of the `DATA_PAGE` as text. A first knee-jerk reaction could be to use some `SUBSTRING`/`PATHINDEX` T-SQL functions to perform a search. However, that seems a little bit too much work.

### Using DBCC PAGE...WITH TABLERESULTS
I haven't mentioned before but we can output the content of the page in a tabular way instead of the text format. For that, we just need to append the `WITH TABLERESULTS` keywords when running the `DBCC PAGE` command.  

First we need to get a `DATA_PAGE` id. As seen before, for that we need to get an `allocated_page_page_id` value from:
``` SQL
-- 2012 or newer
SELECT allocated_page_page_id
  FROM sys.dm_db_database_page_allocations(DB_ID(), OBJECT_ID('dbo.Client'), NULL, NULL, 'DETAILED')
 WHERE page_type_desc = 'DATA_PAGE'
```

[![Get allocated_page_page_id](/img/2024/0415/GetDroppedColumns_Get_allocated_page_page_id_from_sys_dm_db_database_page_allocations.png)](/img/2024/0415/GetDroppedColumns_Get_allocated_page_page_id_from_sys_dm_db_database_page_allocations.png)

Then, we can pick the value `544` and run the following code:  
``` sql
DBCC PAGE ('TableInternals', 1, 544, 3) WITH TABLERESULTS;
```

> Just a quick reminder that undocumented commands (like DBCC PAGE) should be used with caution, as they are not officially supported by Microsoft and could potentially cause issues in your database.

We get the output in a table format like the following:  
[![DBCC PAGE...WITH TABLERESULTS](/img/2024/0415/GetDroppedColumns_DBCC_PAGE_WITH_TABLERESULTS.png)](/img/2024/0415/GetDroppedColumns_DBCC_PAGE_WITH_TABLERESULTS.png)

That said, we can run some extra lines of code to:
1. dump the page content to a temporary table (`#DBCCPAGE`) 
2. run a T-SQL query to search and filter our results.  

If you check carefully on the previous image, you can find, on the `Field` column, the value `DROPPED` highlighted below. 
[![DBCC PAGE...WITH TABLERESULTS](/img/2024/0415/GetDroppedColumns_DROPPED_NULL.png)](/img/2024/0415/GetDroppedColumns_DROPPED_NULL.png)

Let's filter by that.


``` sql
IF OBJECT_ID('tempdb..#DBCCPAGE') IS NOT NULL 
	DROP TABLE #DBCCPAGE;
GO
CREATE TABLE #DBCCPAGE (
    [ParentObject]  VARCHAR(255),
    [Object]        VARCHAR(255),
    [Field]         VARCHAR(255),
    [Value]         VARCHAR(255)
);

/* (1) */
INSERT INTO #DBCCPAGE
EXECUTE ('DBCC PAGE (''TableInternals'', 1, 544, 3) WITH TABLERESULTS;');

/* (2) */
SELECT *
  FROM #DBCCPAGE
WHERE Field = 'DROPPED'
```

[![Find Records with DROPPPED values](/img/2024/0415/GetDroppedColumns_Find_Records_DROPPED_NULL.png)](/img/2024/0415/GetDroppedColumns_Find_Records_DROPPED_NULL.png)


This gives you an idea of one possibility to achieve this task. This example is just for one table and I'm sure you could build some extra code around it to make it check all tables.
However, that isn't necessary(!) because there is a easier, less expensive (resource wise) and quicker way of doing it.


## A better and faster approach - Relying on metadata
What if we had a less cumbersome way to check if we have a column dropped within a table?

Enter some metadata views!  
SQL Server provides some undocumented [system internal views](https://learn.microsoft.com/en-us/previous-versions/sql/sql-server-2008-r2/ms189600(v=sql.105)?redirectedfrom=MSDN) that hold some columns' metadata that are very useful.

This system view `sys.system_internals_partition_columns` has an interesting column called `is_dropped` which, as you can imagine, will contain the value `1` when that same column was dropped but the table wasn't yet rebuilt.

Let's see it in action using our previous example.  
The first part of the script will create a `Client` table with 3 columns and insert one record.

``` sql
DROP TABLE IF EXISTS Client
GO

CREATE TABLE Client
(
	Id			int NOT NULL identity(1,1),
	FirstName	varchar(50),
	DoB			datetime
)
GO

/* Insert one record */
INSERT INTO Client (FirstName, DoB)
VALUES ('Alex', '1900-01-01')
GO

/* Show the record */
SELECT Id, FirstName, DoB
  FROM Client
GO
```

Now, before we drop the `DoB` column let's see what is returned on the `is_dropped` column of the `sys.system_internals_partition_columns` system view for our table.  
For that, we can run the following code:  
``` sql
SELECT object_name(p.object_id) table_name,
		c.[name] as column_name,
    	pc.partition_column_id,
		pc.is_dropped
  FROM sys.system_internals_partitions p
	  JOIN sys.system_internals_partition_columns pc
	    ON p.partition_id = pc.partition_id
	  LEFT JOIN sys.columns c
  	    ON p.object_id = c.object_id
	   AND pc.partition_column_id = c.column_id
 WHERE p.object_id = OBJECT_ID('Client')
```

We can see our 3 columns with sequential IDs (`partition_column_id`) and the `is_dropped` property with value `0`.

[![Check Metadata Before Dropping a column](/img/2024/0415/GetDroppedColumns_Metadata_Before_Drop.png)](/img/2024/0415/GetDroppedColumns_Metadata_Before_Drop.png)

Now, let's drop the `DoB` column:
``` SQL
ALTER TABLE Client
DROP COLUMN DoB
GO
```

And rerun the previous query to check what has changed:  

[![Check Metadata After Dropping a column](/img/2024/0415/GetDroppedColumns_Metadata_After_Drop.png)](/img/2024/0415/GetDroppedColumns_Metadata_After_Drop.png)

As we can see we lost a column name (that was the `DoB` column), the `partition_column_id` changed from `3` to `67108865` and now the `is_dropped` property has the value `1`.

That means if we filter only by the `is_dropped` property we can do a search on all tables of our database.  
``` sql
SELECT object_name(p.object_id) table_name,
		c.[name] as column_name,
    	pc.partition_column_id,
		pc.is_dropped
  FROM sys.system_internals_partitions p
	  JOIN sys.system_internals_partition_columns pc
	    ON p.partition_id = pc.partition_id
	  LEFT JOIN sys.columns c
  	    ON p.object_id = c.object_id
	   AND pc.partition_column_id = c.column_id
 WHERE pc.is_dropped = 1
```

[![Get all tables with dropped columns](/img/2024/0415/GetDroppedColumns_Metadata_All_is_dropped_columns.png)](/img/2024/0415/GetDroppedColumns_Metadata_All_is_dropped_columns.png)

Cool stuff!

>**NOTE:**  With this query, if you have dropped columns on a partitioned table, you will get a record for each existing partition of that same table.

## Wrap up
In this article, we saw the output of the contents of a page using `DBCC PAGE` with a table format and how that could let us use T-SQL to filter records, like if we have dropped columns. 
We then saw an easier way to find our dropped columns by using some undocumented system views.

In my next article, I will share how we can have an idea of how much space our dropped columns are still holding so you can decide how quickly you want to schedule some maintenance tasks to recover that space.

Thanks for reading
