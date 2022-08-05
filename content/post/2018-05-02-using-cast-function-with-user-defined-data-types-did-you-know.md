---
author: claudiosilva
comments: true
date: "2018-05-02T00:00:00Z"
tags:
- CAST
- CONVERT
- DidYouKnow
- Firebird
- SQLServer
- syndicated
- UDDT
- User-defined Data Types
title: Using CAST() function with User-Defined Data Types...Did you know...
---
I'm converting some <a href="https://www.firebirdsql.org" rel="noopener" target="_blank">Firebird</a> database code to T-SQL and I'm seeing a lot of code that doesn't work in the same way that SQL Server.
No surprise - I already expected that but for those that still say that "all engines/databases are equal"..."is SQL right?" here is another proof that is not true.

On Firebird it is possible to use the CAST function using a [DOMAIN](https://firebirdsql.org/file/documentation/reference_manuals/fblangref25-en/html/fblangref25-ddl-domn.html) (the equivalent in SQLServer is [UDDT - User-Defined Data Types](https://docs.microsoft.com/en-us/dotnet/visual-basic/language-reference/data-types/user-defined-data-type)) as target data-type, well turns out that on SQL Server...<b>that is not possible</b>.

Which means that, even if I have created a UDDT as:

``` sql
CREATE TYPE dbo.VARCHAR_50 FROM VARCHAR(50);
```

The following code will not work

``` sql
SELECT CAST('value' AS VARCHAR_50)
```

and it yields the following error message:

<blockquote><i>Msg 243, Level 16, State 2, Line 1</i>
<i>Type VARCHAR_50 is not a defined system type.</i>

this means that we need to change it to the defined system type like:

``` sql
SELECT CAST('value' as VARCHAR(50))
```

Maybe it works with [CONVERT()](https://docs.microsoft.com/en-us/sql/t-sql/functions/cast-and-convert-transact-sql?view=sql-server-2017) function?!...not really, the behaviour is the same.

To finish the title...Using CAST() function with User-Defined Data Types...Did you know... it is not possible. You need to use the system type.

Thanks for reading.
