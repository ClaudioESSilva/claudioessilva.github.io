---
author: claudiosilva
comments: true
date: "2018-04-06T00:00:00Z"
tags:
- DATETIME
- DATETIME2
- Did You Know
- DidYouKnow
- Operand type clash
- SQLServer
- syndicated
title: Did you know…you can’t do arithmetic operations with datetime2 like with datetime?
---
I’m currently working on a SQL code migration from [Firebird](https://firebirdsql.org/) to SQL Server and I hit an error that I haven’t seen for some time.

The error message is the following:

<blockquote>Msg 206, Level 16, State 2, Line 4
Operand type clash: datetime2 is incompatible with int

This ringed the bell right away! Somewhere on the code someone was trying to do an arithmetic calculation without using the proper function.

## How so?

In the early days of my T-SQL coding, I used to do this a lot. Also, I still see some code from other applications that still use it this way. Take, for instance, the following code that returns all orders placed with more than 1 day old:

``` sql
SELECT OrderId, ClientId, Quantity, OrderDate
FROM dbo.Orders
WHERE OrderDate < GETDATE() -1
```

For this example let’s say that the OrderDate column is a DATETIME2. This works just fine because the GETDATE() function returns a DATETIME value and thus we can subtract one day from it.

If we define a variable of `DATETIME2` datatype and assign it a `GETDATE()` value, then attempt to subtract-1 from the variable, an error will yield!

``` sql
DECLARE @vOrderDate DATETIME2 = GETDATE()
SELECT OrderId, ClientId, Quantity, OrderDate
FROM dbo.Orders
WHERE OrderDate < @vOrderDate - 1
```

<blockquote>Msg 206, Level 16, State 2, Line 20
Operand type clash: datetime2 is incompatible with int

## But it was working!?

Yes it was on the source engine (Firebird) and it will still work on the destination (SQLServer) if the datatype is still the same - DATETIME.

What happened here was the column datatype was changed during the schema migration from DATETIME to DATETIME2.

NOTE: The most recent date/time datatypes appeared with SQL Server 2008. They are [DATE](https://docs.microsoft.com/en-us/sql/t-sql/data-types/date-transact-sql), [TIME](https://docs.microsoft.com/en-us/sql/t-sql/data-types/time-transact-sql), [DATETIME2](https://docs.microsoft.com/en-us/sql/t-sql/data-types/datetime2-transact-sql), [DATETIMEOFFSET](https://docs.microsoft.com/en-us/sql/t-sql/data-types/datetimeoffset-transact-sql).
Also, bear in mind that actually the [DATETIME](https://docs.microsoft.com/en-us/sql/t-sql/data-types/datetime-transact-sql) and [SMALLDATETIME](https://docs.microsoft.com/en-us/sql/t-sql/data-types/smalldatetime-transact-sql) datatypes are the only from the date/time family that supports this arithmetic operations.

## How to fix this error?

To solve this, we need to convert the

``` sql
@vOrderDate  -1
```
to

``` sql
DATEADD(dd, -1, @vOrderDate)
```

Whole code looks like:

``` sql
DECLARE @vOrderDate DATETIME2 = GETDATE()
SELECT OrderId, ClientId, Quantity, OrderDate
FROM dbo.Orders
WHERE OrderDate < DATEADD(dd, -1, @vOrderDate)
```

this way, it will work with DATETIME, DATETIME2, DATE, SMALLDATETIME and DATETIMEOFFSET datatypes.

NOTE: [DATEADD](https://docs.microsoft.com/en-us/sql/t-sql/functions/dateadd-transact-sql) also support TIME datatype, I didn’t mention because on our example we are subtracting DAYS, and as (at least I) expected this will give an error.

## Wrap up

Are you thinking about changing your `DATETIME` columns to `DATETIME2`? Or are you just beginning to use it in your projects?
Documentation encourages you to do so (https://docs.microsoft.com/en-us/sql/t-sql/data-types/datetime-transact-sql) but as you could see from this post, you need to pay attention and do the proper testing and T-SQL code revision.

Thanks for reading.
