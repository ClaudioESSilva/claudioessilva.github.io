---
author: claudiosilva
comments: true
date: "2022-06-17T00:00:00Z"
image: null
tags:
- SQLServer
- Partitioning
- Index
- Exceptions
- dbatools
- syndicate
title: Partitioning and the wrong index definiton
draft: true
---

???? More than solve a problem the thing that I really like is to be able to understand it.
You may be thinking, "how does him solve problems without understanding them?" I feel you it's strange, but sometimes we try something that "just works" but, we keep the curiosity about the why and then we invest the time to try to replicate and understand it even better.

A couple of days ago we were working on a client issue related with partitioning. While trying to do a `SWITCH OUT` operation

``` sql
ALTER TABLE myPartTable SWITCH PARTITION 2 TO dbo.myNonPartTable ;
```

we received the following error message:

>ALTER TABLE SWITCH statement failed. There is no identical index in source table '%.*ls' for the index '%.*ls' in target table '%.*ls' .

## Context

While changing the `PRIMARY KEY` from `CLUSTERED` to `NONCLUSTERED` and created a new `CLUSTERED` index on the source (partitioned) table the same wasn't done immediately for the destination table.

### Table and index structure need to match

As we can find on the documentation [Table and Index Structure Requirements](https://docs.microsoft.com/en-us/previous-versions/sql/sql-server-2008-r2/ms191160(v=sql.105)) 

> <b>Source and target tables must have the same column structure and order. The tables must have the same columns </b> with the same names and the same data type, length, collation, precision, scale, nullability, <b>and PRIMARY KEY constraints (if any)</b>, and also have the same settings for ANSI_NULLS and QUOTED IDENTIFIER. Additionally, the columns must be defined in the same order. The IDENTITY property is not considered.

## Analysis of the structure

After we realized the problem, we used one of our scripts from our swiss-army-knife that will show the index structure. Basically this is one of those scripts that tell us the index key columns, included columns and its order.

## Time for a demo

If you want to run this demo by your own, just make sure you are running on a SQL Server 2012 or higher as it uses `sys.dm_db_database_page_allocations` that was introduced on that version.

A word of caution regarding the usage of this DMF at scale. I suggest that you read the `Problem` section on [this article](https://www.mssqltips.com/sqlservertip/5714/new-function-in-sql-server-2019-sysdmdbpageinfo/) by Aaron Bertrand ([b](https://sqlblog.org/) | [t](https://twitter.com/AaronBertrand)). 

This script creates:

* partition function for a `bit` datatype
* partition schema with `ALL` partitions mapped to the `PRIMARY` filegroup.
* creates two tables:
  * one partitioned with:
    * `NONCLUSTERED` index that is also the `PRIMARY KEY` on columns `ID` and `PROCESSED`
    * `CLUSTERED` index on column `COST`
    * both [aligned indexes](https://docs.microsoft.com/en-us/sql/relational-databases/partitions/partitioned-tables-and-indexes?view=sql-server-ver16#aligned-index) - means they use the same partition schema as its corresponding table.
  * the second one non-partitioned with:
    * `NONCLUSTERED` index that is also the `PRIMARY KEY` on columns `ID` and `PROCESSED`
    * `CLUSTERED` index on column `COST`

The script will also insert a couple of records on the source (partitioned) table so we can run the `SWITCH OUT` command and see the error happening. Note: [The receiving partition must exist and it must be empty](https://docs.microsoft.com/en-us/previous-versions/sql/sql-server-2008-r2/ms191160(v=sql.105)).

Run the script to build all the structure.

## Partition switch out to non-partitioned table

Before we run our `SWITCH OUT` command to test, one may be wondering "moving partitions to a non-partitioned table is that even possible?" Yes it is. There are at least two scenarios where I find it useful:

1. you just need to truncate the data (no need to archive keep it)
2. if you want to archive that data to independent tables (think, as example, a year table).

## The error

It's time to run our `SWITCH OUT` statement

``` sql
ALTER TABLE myPartTable SWITCH PARTITION 2 TO dbo.myNonPartTable ;
```

And, as said before it will fail. But why?

Let's compare the DDL of our two tables
ToDo: image with code

The "only difference" is that the partitioned table uses the partition schema and the non-partition doesn't.

Let's run our script and check the `CIDX_COST` index definition
ToDo: image with result of script that gives index key column and order

We just mentioned one column on the index creation but...it shows two here but only for the partitioned table. That is easy to [explain](https://docs.microsoft.com/en-us/sql/relational-databases/partitions/partitioned-tables-and-indexes?view=sql-server-ver16#partitioning-clustered-indexes):

> When partitioning a nonunique clustered index and the partitioning column is not explicitly specified in the clustering key, **the database engine adds the partitioning column by default** to the list of clustered index keys.

That's the reason why we see the partitioning column on the index definition.

## Let's match the index structure

Add index with partitioning column in front of the list (1st place)

Show that gives error

Add the other way around - it works.

## Why?

ToDo: Show the content of the page to proof that order of fields is the correct

## So why it's the script showing that way?

Custom script uses wrong order (order by columns).
In general almost all versions I found are doing the key column order

## Should mention?

- Not a performance feature (point to Kendra's course: https://littlekendra.com/course/why-table-partitioning-does-not-speed-up-query-performance-with-exception/ <- is it free?)

## dbatools works

## dbatools works
# ADD MVP_ID TO docs links