---
author: claudiosilva
comments: true
date: "2021-12-29T00:00:00Z"
tags:
- SQLServer
- syndicated
- DACPAC
- IndexedViews
- FullTextSearch
- FTS
- SQLPackage
title: A (big) SQLPackage caveat
---

## Context
I had a request to help with a database from a third-party vendor which uses a lot of [FullText-Search](https://docs.microsoft.com/en-us/sql/relational-databases/search/full-text-search) (FTS) catalogs.
I have to say that I just have played a handful of times with FTS, mostly in a didactic way, and not so much in the perspective of a production system and its maintenance.

Long story short, this client had a couple of problems in the past with FTS. Sometimes it wasn't being populated as expected, other times it was giving errors that indicate the catalog has problems.

These problems seem to be possible to overcome with the rebuild (and sometimes doing a drop and re-creation) of the catalog.

Until the day that this wasn’t possible anymore. The last time they had the problem they requested help due to the following error message:

<span style="color:red">
Msg 9972, Level 16, State 105, Line 20
Database is not fully started up or it is not in an ONLINE state. Try the full-text DDL command again after database is started up and becomes ONLINE.</span>

This showed up when they were trying to do some maintenance like REBUILD a FTS index.

Turns out the database had corrupted metadata (confirmed by MS).

### But there is more
When we opened the support case with Microsoft, after some months of back and forth emails and tests, they told us that not only the metadata was corrupted but they also mentioned the following message:

> Check Catalog Msg 3859, State 1: Warning: The system catalog was updated directly in database ID <x>, most recently at <datetime>.

This message means that on that date there had been a manual action on some of the system tables of that database.
It might have no relation with the current issue we were facing, as it was from some years ago but it showcases that this database already encountered some important enough issues in the past to have had manual tempering.

### Other attempts
Out of curiosity, you may be asking what else I tried in the meantime. Here is a NOT exhaustive list:
- Perform the actions with the database in single-user mode.
- Perform the actions with DAC.
- Perform the actions with SQL Server in single-user mode. (could do a couple of things but not solve the problem)

## Moving on...let's solve the problem
The suggestion was to create a new and empty database and import all the data.
Together with the vendor, we decided to use the SqlPackage tool and generate a DACPAC with all the data and import it on a new empty database.

## Testing the DACPAC
On a test instance, I restored a copy of the database and created a new one (empty, without any objects).
Then I downloaded and installed the [SqlPackage](https://docs.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-download?view=sql-server-ver15) tool.

### Before exporting the data...
I decided to do a test to make sure that all objects (Stored Procedures, Views, Indexes, etc) would be created without any errors, for that I started by exporting only the schema:

``` powershell
&"C:\Program Files\Microsoft SQL Server\150\DAC\bin\SqlPackage.exe" /action:Extract /TargetFile:"D:\temp\DatabaseName_SO.dacpac" /sourceDatabasename:"DatabaseName" /sourceservername:"SQLInstance"
```

Then, I have tested publishing it:
``` powershell
&"C:\Program Files\Microsoft SQL Server\150\DAC\bin\SqlPackage.exe" /action:Publish /SourceFile:"D:\temp\DatabaseName_SO.dacpac" /TargetDatabaseName:"DatabaseName_new" /TargetServerName:"SQLInstance"
```

And... I got some errors like `operand type clash` which means that the datatypes used on some stored procedure parameters do not match the data type of the columns. This can happen (and it was the case) after the schema of a table changed but the stored procedure code was not updated to follow the changes.

After finding all occurrences I updated the stored procedures and did a new extract and published it. This time without any errors.

> NOTE:
I decided to not export the data at the same time as this was a database with ~300GB of data and that would make the export take much longer and if I needed to repeat it (has it happened), would take twice the time. To export just the schema it took around 15 minutes, your mileage may vary depending on how many objects you have on the database.

### Exporting with data
Now that I know the schema will compile without errors, let's extract the data too.

``` powershell
&"C:\Program Files\Microsoft SQL Server\150\DAC\bin\SqlPackage.exe" /action:Extract /TargetFile:"D:\temp\DatabaseName_SD.dacpac" /sourceDatabasename:"DatabaseName" /sourceservername:"SQLInstance" /p:ExtractAllTableData=true
```

From the ~300GB of data, this ended in a ~30GB DACPAC file which, it's an impressive compression ratio, I might add! In terms of duration, it took ~4hours.

### Importing the data
Now that we have our 30GB DACPAC, we can import the data. For that we need to use the `Publish` action.
``` powershell
&"C:\Program Files\Microsoft SQL Server\150\DAC\bin\SqlPackage.exe" /action:Publish /SourceFile:"D:\temp\DatabaseName_SD.dacpac" /sourceDatabasename:"DatabaseName_new" /sourceservername:"SQLInstance"
```

## The caveat
Now we just need to wait for it...and wait, and wait and...after 23h (yes almost a day) it failed due T-Log full!

The publish action was already inserting data and has done it on multiple tables. I was following the process by running `sp_WhoIsActive` to check which instructions were running and found that for a specific table it was taking a huge amount of time (hours!!) but, why?!

I have taken the execution plan using `sp_WhoIsActive @get_plans = 1` and did an analysis where I saw multiple tables. After all, it was not a table but rather an **indexed view** that has multiple non-clustered indexes and uses multiple underlying tables.

### What does SqlPackage do?
SqlPackage does some interesting actions like disable constraints and re-enable afterwards, same for triggers and it also disables the non-clustered indexes of the tables so they can be rebuilt afterwards.

### What doesn’t SqlPackage do?
I learned, the hard way, that SqlPackage doesn't disable the indexes of the indexed views!
For this scenario, it means that when we were inserting data on tables that are used on the indexed views, these need to be updated (materialized) and because we didn't have the NonClustered indexes enabled on the base tables this would take ages to finish!

The execution plan showed some HUGE index spool operators.

## My approach
Once I understood this was the problem and that SqlPackage won't interfere with the indexed views, I decided to reset the empty database, trigger the `Publish` again and as soon as the schema was created and the data started to be inserted I run the instructions to `DISABLE` the Clustered indexes (thus the indexed views) and the cool part is that the NonClustered indexes are disabled automatically.

You can generate the T-SQL instructions with some T-SQL code like:
``` sql
SELECT N'ALTER INDEX ' + quotename(i.name) + N' ON ' + quotename(s.name) + '.' + quotename(o.name) + ' DISABLE;' + CHAR(13) + CHAR(10) + 'GO' + CHAR(13) + CHAR(10)
FROM sys.indexes I
    INNER JOIN sys.objects O
        INNER JOIN sys.schemas s
        ON s.schema_id = o.schema_id
    ON I.object_id = O.object_id
WHERE i.type_desc = 'CLUSTERED'
AND O.type = 'V'
```

With this, the whole import was able to run in ~12h (!!) and the T-LOG was not even close to becoming full.

After this, I have rebuilt the clustered and nonclustered indexes of the indexed views. (you can adapt the previous block of code to generate the instructions)

Finally, the last step was to rebuild and populate the FTS catalogs.

## Wrapping up
Always try to have the vendor/dev aligned with you. This is a must-have especially when you don't know the database.
Just remember that sometimes it can be tempting to go with a default/well-known approach but because each database can be differemt, we can fall into some traps. Hence, test, test, test.

Do you know any other caveats like this one when working with DACPAC?
Feel free to leave a comment.

Thanks for reading!
