---
author: claudiosilva
comments: true
date: "2024-05-29T11:00:00Z"
tags:
- SQLServer
- TSQL
- DBA
- Internals
- Table Structure
- DBCC IND
- DBCC PAGE
- syndicated
title: "What happens when we drop a column on a SQL Server table? Where's my space?"
autoThumbnailImage: false
thumbnailImagePosition: top
thumbnailImage: /img/2024/0301/TableInternals_droppedColumn.png
coverImage: /img/2024/0301/TableInternals_droppedColumn_CoverImage.png
metaAlignment: center
coverMeta: out
---

> This article was initially posted on [SQLServerCentral](https://www.sqlservercentral.com/articles/what-happens-when-we-drop-a-column-on-a-sql-server-table-wheres-my-space) @ 2024-04-26.

Short answer: The column is marked as 'deleted' and will stop being visible/usable.  
But, most importantly - **The record/table size will remain unchanged**.

# A metadata operation
Dropping a column is a metadata/logical operation, not a physical one. This means that the data isn't removed/overwritten by this action. 

If we were talking about deleting data (records), as Paul Randal mentions [here](https://www.sqlskills.com/blogs/paul/inside-the-storage-engine-anatomy-of-a-page/): 
> "the cost of that will be deferred for the inserters and not for the deleters". 

## Does that mean that the content is still visible?
Sort of. If you try to query the table, because the metadata of the table no longer knows of its existence, you can't query that column and therefore you don't see data.  

However, if we inspect the contents of a data page we may be able to still see some metadata from the column that we just dropped.  
We can see that there was a column on a specific `Offset` that occupies `Length (physical) X` (where 'X' is the number of bytes) is now `DROPPED`.

{{<
   figure src="/img/2024/0301/TableInternals_droppedColumn.png"
   alt="Inside the page after column dropped"
   link="/img/2024/0301/TableInternals_droppedColumn.png"
>}}

### "Metadata isn't 'the' data"
That's correct. What I found is that if you test this with a `(n)varchar` / `(n)char` data type you will still be able to see which text was on the column/record by inspecting the page.  

Back to the main idea of this post, let's see how we can prove that space-wise nothing changes.

## Seeing is believing - prepare the environment
To play around and see some interesting data let's set up a database named `TableInternals` and create a table named `Client`.

``` SQL
CREATE DATABASE TableInternals
GO

USE TableInternals
GO


DROP TABLE IF EXISTS Client
GO

CREATE TABLE Client
(
	Id			int NOT NULL identity(1,1),
	FirstName	varchar(50),
	DoB			datetime
)
GO
```

### Now let's insert 50,000 records
The data we are going to insert will be all equal, in this case, it does not have to make sense, so I chose `Alex` for the `Name` and a `1900-01-01` for a `DoB` (Date of Birth) columns.

For that, I will use a query that relies on a bunch of CTEs to generate more records easily.

```SQL
;WITH
    L0 AS ( SELECT 1 AS c 
            FROM (VALUES(1),(1),(1),(1),(1),(1),(1),(1),
                        (1),(1),(1),(1),(1),(1),(1),(1)) AS D(c) ),
    L1 AS ( SELECT 1 AS c FROM L0 AS A CROSS JOIN L0 AS B ),
    L2 AS ( SELECT 1 AS c FROM L1 AS A CROSS JOIN L1 AS B ),
    L3 AS ( SELECT 1 AS c FROM L2 AS A CROSS JOIN L2 AS B ),
    Nums AS ( SELECT ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS rownum
              FROM L3 
			)
	INSERT INTO Client (FirstName, DoB)
	SELECT TOP (50000) 'Alex', '1900-01-01'
	  FROM Nums
GO
```

### The size of our table
To have an idea and so we can compare it with later actions, let's just check what is the current data size of this table right after being created.
For that let's use `sp_spaceused` system stored procedure

``` SQL
sp_spaceused Client
```

{{<
   figure src="/img/2024/0301/TableInternals_spaceused_newTable.png"
   alt="sp_spaceused"
   class=center
>}}

We have `1440 KB` of data pages meaning 180 pages (each page has 8KB).

## How to find a data page?
To be able to check the content of a page we first need a way to find which pages are allocated to a specific table. 

For that, we can either use the `DBCC IND` command - which isn't officially documented:

``` SQL
-- The syntax
DBCC IND (database_name, table_name, index_id);
``` 

or, since SQL Server 2012 you can also use the - still undocumented - `sys.dm_db_database_page_allocations` dynamic management function (DMF). 

``` SQL
-- The syntax
SELECT * FROM sys.dm_db_database_page_allocations(@DatabaseId, @TableId, @IndexId, @PartionId, @Mode)
``` 

> Just a quick reminder that undocumented commands should be used with caution, as they are not officially supported by Microsoft and could potentially cause issues in your database.


### Examples for the win
Using our example let's run the following T-SQL:

``` SQL
-- Old way to see page allocations
DBCC IND ('TableInternals', 'Client', 1);
```

[![DBCC IND output example](/img/2024/0301/TableInternals_DBCC_IND_Output.png)](/img/2024/0301/TableInternals_DBCC_IND_Output.png)


Or as mentioned before you can also use
``` SQL
-- 2012 or newer and with more information
SELECT *
FROM sys.dm_db_database_page_allocations(DB_ID(), OBJECT_ID('dbo.Client'), NULL, NULL, 'DETAILED')
```

[![sys.dm_db_database_page_allocations output example](/img/2024/0301/TableInternals_dm_db_database_page_allocations_Output.png)](/img/2024/0301/TableInternals_dm_db_database_page_allocations_Output.png)

The most attentive readers will have noticed that the output of this DMF returned 185 rows (the output of DBCC IND only returns 181.).  
This means 185 pages are assigned to this table. "Cláudio, but you mentioned before just 180 pages, right?" - correct, 180 `DATA` pages. In this case, the other 5 pages are divided as follows:
 - 4 pages assigned but still unused - Link to the `unused` space. 4 pages x 8 KB = `32 KB`.
 - 1 page - the `IAM_PAGE` that is shown in the `index_size` even that technically isn't an index.

**Note:** As you can see, the number of columns in the results is a bit different, with the new method retrieving more columns/data compared with `DBCC IND`.


## Checking the contents of a data page
Now that we can see some pages of type `DATA_PAGE` (`PageType = 1` on the `DBCC IND` output or `page_type = 1` for the DMF) and their IDs (Note that the page IDs returned may differ on your server), let's pick one and pass it to a new command.

In this case, we need to use the `DBCC PAGE` command. 
This is another undocumented command. The syntax is:
``` SQL 
DBCC PAGE ( {‘dbname’ | dbid}, filenum, pagenum [, printopt={0|1|2|3} ])
```

> If you want to know more about this command head to the great post [Inside the Storage Engine: Using DBCC PAGE and DBCC IND to find out if page splits ever roll back](https://www.sqlskills.com/blogs/paul/inside-the-storage-engine-using-dbcc-page-and-dbcc-ind-to-find-out-if-page-splits-ever-roll-back/) and to understand the results check the post [Inside the Storage Engine: Anatomy of a page](https://www.sqlskills.com/blogs/paul/inside-the-storage-engine-anatomy-of-a-page/) post both from [Paul Randal](https://www.sqlskills.com/blogs/paul).

### Continuing with our example
By running the following T-SQL we will be able to get a dump of the data page to the console

``` SQL 
DBCC TRACEON (3604);
GO

DBCC PAGE ('TableInternals', 1, 544, 3);
GO
```

The traceflag `3604` is to make the output of `DBCC PAGE` go to the console, rather than to the error log.
On the `DBCC PAGE` parameters, the `printopt=3` means we will get the `page header plus detailed per-row interpretation`.


If we scroll on the results we will find the values of each column in the record. 

[![DBCC PAGE 3 Output example](/img/2024/0301/TableInternals_DBCC_PAGE_3_ColumnValues.png)](/img/2024/0301/TableInternals_DBCC_PAGE_3_ColumnValues.png)


> NOTE: There is also a DMF that can return some of the information about a page in the database. If we are using SQL Server 2019 or a later version the `sys.dm_db_page_info` DMF gives you page header information (but not the contents/records within the page). This one is documented and is currently supported! Check it here: [sys.dm_db_page_info (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-page-info-transact-sql)


## Dropping the column
Now, let's drop the `DoB` column 
``` SQL
ALTER TABLE Client
DROP COLUMN DoB
GO
```

### What is the actual data size?
We have just dropped a column that occupies 8 bytes per record. As we have 50,000 records on the table we should get some space back, right?
Negative!

If you run again the `sp_spaceused` command you will find that nothing changed
``` SQL
sp_spaceused Client
```

{{<
   figure src="/img/2024/0301/TableInternals_spaceused_newTable.png"
   alt="sp_spaceused same picture as before because nothing changes"
   class=center
>}}

We still see the same 1,440 KB of data.

### What changed on the content of the page?
Let's dump the content of the same page again to check what changed.

``` SQL 
DBCC TRACEON (3604);
GO

DBCC PAGE ('TableInternals', 1, 544, 3);
GO
```

This is what we get:

[![DBCC PAGE 3 Output example after dropping a column](/img/2024/0301/TableInternals_DBCC_PAGE_3_AfterDrop.png)](/img/2024/0301/TableInternals_DBCC_PAGE_3_AfterDrop.png)

As I have mentioned before, we can now see that we had a column in a specific offset `0x8` which now has `Length 0` but the `Length (physical) 8` and what was before a `column name = datetime value` is now `DROPPED = NULL`.


# How can we reclaim the space?
The answer is simple, however, being able to do it can be a different story.

But let's start with the answer. Rebuild. Yes, you will need to rebuild the table/index to clear that space that is marked to be re-utilized.

``` SQL 
-- Let's clear the dropped column and tidy up things
ALTER TABLE Client REBUILD 
```

And now, if we check the space used again we can see a difference.

For that, we need to run again the following:
``` SQL
sp_spaceused Client
```

{{<
   figure src="/img/2024/0301/TableInternals_spaceused_afterDropAndRebuild.png"
   alt="sp_spaceused after table rebuild"
   class=center
>}}

This shows that we have recovered `400 KB` of data meaning 50 pages less.

### Why it may be not so easy to do it?
This is more of a heads-up when working with big tables and/or small downtime windows.  

There aren't free lunches! Depending on the version/edition of SQL Server being used this action can take longer than expected.  

If you are working on a Standard Edition remember that you can't create/rebuild indexes with the `ONLINE=ON` and this operation is single-thread (no parallelism).  

On the other hand, if you are working on an Enterprise Edition, you can use `ONLINE=ON` and parallelism but be aware that doing the online operation can/will require more transaction log space. If you are working with SQL Server 2017+ I recommend taking a look at [Resumable Index](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/guidelines-for-online-index-operations?view=sql-server-ver16#resumable-index-considerations) because it:
> Enables truncation of transaction logs during an index create or rebuild operation.

## Wrap Up
In this article, we saw how to use some undocumented commands in T-SQL to be able to see the contents of a data page. 
We then, walk through what happens when a column is dropped and why we don't see any space being reclaimed by that action.
Finally, we saw how you can reclaim that space.

This just covers HEAP or CLUSTERED tables, we didn't cover all scenarios, here are some for you to explore:
 - Data types that write on `ROW_OVERFLOW_DATA` or `LOB_DATA` allocations.
 - NONCLUSTERED indexes

Thanks for reading


