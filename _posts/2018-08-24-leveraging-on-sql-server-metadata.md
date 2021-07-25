---
layout: post
title: Leveraging on SQL Server metadata
date: 2018-08-24 10:02
author: claudiosilva
comments: true
tags: [Automation, Firebird, Metadata, PowerShell, SQL Server, SQLPrompt, SQLServer, syndicated]
---
I'm working on a project where I need to convert Firebird SQL code into T-SQL code.
No schema, just the modules. There are more than 1000 objects between stored procedures, views, triggers, user-defined data types, etc.

<h2>First - the pain...</h2>

While checking the <a href="https://firebirdsql.org/en/reference-manuals/">Firebird reference manuals</a> I saw a lot of different concepts (Selectable Stored Procedures - Yes you can do SELECT FROM StoredProcedure) and different functions names with different syntax compared to T-SQL.

With this in mind, can you imagine doing a code migration between two different SQL flavours that contains more than 60000 lines of code by hand? 😨

<h3>and...the false alarm - My approach</h3>

When I started to think about the possible approaches to this huge amount of work I will have, one of the ideas (and actually the one I ended up doing) was write a find/replace function in PowerShell that can receive an hashtable with "pattern to search" and the "pattern to replace".

Because the `-replace` method allows the use of regular expressions this become very powerful.

<h4>Don't reinvent the wheel</h4>

I did a search and found a <a href="https://gist.github.com/MatthewSteeples/1961d4bf4892f09d32029">gist from Matthew Steeples</a> that has a function to do a find/replace of a single string on a file using regular expressions.

I picked this script and I have adapted to my reality. This means, I have changed the code in order to:

<ul>
<li>Accept an ordered hashtable and this way do multiple changes.</li>
<li>Open the file and do all the changes before save it again.</li>
</ul>

You can find on my GitHub repository the <a href="https://github.com/ClaudioESSilva/SQLServer-PowerShell/tree/master/PowerShell/Set-Expression">Set-Expression PowerShell function</a> I ended with.

<h4>Filling the hastable</h4>

To fill the hashtable I had to make a match between the two SQL flavours.

Just a couple of examples to ilustrate the differences:

Firebird has the `similar` function which translate to `LIKE '%%'` on T-SQL
Other example is the `SUBSTRING` function which has the following structure `SUBSTRING([field] from [start_position] for [number of chars])` which, in order to translate for T-SQL, we just need to replace the "from" and "for" words by a comma (",").

<blockquote>Everything was going well, work was progressing at a good pace until...</blockquote>

<h3>The pain strikes back</h3>

These databases make a heavy use of triggers. The main use of it is to generate a new ID to a column based on a Firebird DOMAIN object (SEQUENCES in T-SQL) on `BEFORE INSERT` (INSTEAD OF in T-SQL) triggers.

Note: "But they can use `IDENTITY` columns..." - Exactly what I have proposed, and for some tables they have implemented but for the majority it wasn't possible.

Firebird make this somehow easy. This is a code example from an Firebird trigger:
``` sql
CREATE OR ALTER TRIGGER Customers_BI FOR Customers
ACTIVE BEFORE INSERT POSITION 0
as
begin
  if (new.id is null) then
    new.id = gen_id(gen_Customers_id,1);
end;
```

in T-SQL syntax, we need to set the whole `INSERT` statement with all columns from the `INSERTED` table. The equivalent code can be something like this:
``` sql
CREATE TRIGGER dbo.Customers_BI
ON dbo.Customers
INSTEAD OF INSERT
AS
    BEGIN
          IF EXISTS
            (
                SELECT
                       1
                  FROM INSERTED
                 WHERE Inserted.ID IS NULL
            )
              BEGIN
                    INSERT INTO dbo.Customers (ID, <other columns>
                    SELECT
                           NEXT VALUE FOR dbo.gen_Customers_id
                         , <other columns>
                    FROM INSERTED;
             END
    END;
```

<h3>"so you need to replace 1 line with an `INSERT` statement with all columns from the table..."</h3>

Yes that much work..on almost 300 triggers! Feeling the pain, right?

<h1>Here is where the SQL Server metadata joins the party!</h1>

This is just an example, but with it you can imagine the others :-)

I wrote a piece of T-SQL (not pretty but it works) that creates, for each table, the hashtable entry for my find/replace function.

``` sql
SELECT
      A.TABLE_NAME
    , '''(FOR )(\b' + A.TABLE_NAME
      + '\b)((.|\r\n){1,})(\bACTIVE BEFORE INSERT POSITION 0\b)(\r\n)(AS)(\r\n)(BEGIN)(\r\n)((.|\n){1,})(gen_id\()(\w{1,})((.|\r\n)*?)(?=end;)(.*)'' = "ON `$2`$3INSTEAD OF INSERT`$3`$7`$8`$9`$10`$11`$12 `$3INSERT INTO `$2 ( '
      + A.ColumnList + ' ) `$3SELECT NEXT VALUE FOR dbo.`$14, ' + A.ColumnList + ' FROM INSERTED `$3 --`$13`$14`$15`$16`$17"'
    , '''(FOR )(\b' + A.TABLE_NAME
      + '\b)((.|\r\n){1,})(\bACTIVE BEFORE UPDATE POSITION 0\b)(\r\n)(AS)(\r\n)(BEGIN)(\r\n)((.|\r\n){1,})((.|\r\n)*?)(?=end;)(.*)'' = "ON `$2`$3INSTEAD OF UPDATE`$3`$7`$8`$9 `$3UPDATE `$2 `$3SET '
      + A.ColumnListUpdate + ', `$10`$11 FROM INSERTED `$3 `$15"'
  FROM
      (
          SELECT DISTINCT
                 ISC.TABLE_NAME
               , STUFF((
                           SELECT
                                  ', ' + ISC1.COLUMN_NAME
                             FROM INFORMATION_SCHEMA.COLUMNS AS ISC1
                            WHERE OBJECT_ID(ISC1.TABLE_NAME) = OBJECT_ID(ISC.TABLE_NAME)
                            ORDER BY ISC1.ORDINAL_POSITION
                           FOR XML PATH('')
                       )
                     , 1
                     , 1
                     , ''
                      ) AS ColumnList
               , STUFF((
                           SELECT
                                  ', ' + ISC1.COLUMN_NAME + ' = ' + ISC1.COLUMN_NAME
                             FROM INFORMATION_SCHEMA.COLUMNS AS ISC1
                            WHERE OBJECT_ID(ISC1.TABLE_NAME) = OBJECT_ID(ISC.TABLE_NAME)
                            ORDER BY ISC1.ORDINAL_POSITION
                           FOR XML PATH('')
                       )
                     , 1
                     , 1
                     , ''
                      ) AS ColumnListUpdate
            FROM INFORMATION_SCHEMA.COLUMNS AS ISC
                 INNER JOIN sys.sysobjects AS so
                    ON ISC.TABLE_NAME = so.name
                   AND so.type = 'U'
           WHERE ISC.TABLE_NAME NOT IN ('sysdiagrams', 'Numbers')
      ) AS A
 ORDER BY A.TABLE_NAME;
```

Let's say I have a `Customers` table with 3 columns `ID, NAME, COMPANY_NAME` the output will be:
<a href="https://claudioessilva.github.io/img/2018/08/output_triggers.png"><img src="https://claudioessilva.github.io/img/2018/08/output_triggers.png" alt="" width="656" height="36" class="aligncenter size-full wp-image-1516" /></a>

Example of the full string for the INSTEAD OF INSERT trigger:
```
'(FOR )(\bCustomers\b)((.|\r\n){1,})(\bACTIVE BEFORE INSERT POSITION 0\b)(\r\n)(AS)(\r\n)(BEGIN)(\r\n)((.|\n){1,})(gen_id\()(\w{1,})((.|\r\n)*?)(?=end;)(.*)' = "ON `$2`$3INSTEAD OF INSERT`$3`$7`$8`$9`$10`$11`$12 `$3INSERT INTO `$2 (  ID, NAME, COMPANY_NAME ) `$3SELECT NEXT VALUE FOR dbo.`$14,  ID, NAME, COMPANY_NAME FROM INSERTED `$3 --`$13`$14`$15`$16`$17"`
```

This way I can just copy/paste the result to my hashtable and run the PowerShell function on my triggers' files.

<h3>All's well that ends well</h3>

This made possible to automate, I would say, 95% of the work I have to do on each trigger object.

The 5% left are purposeful and intended to format the code using <a href="https://www.red-gate.com/products/sql-development/sql-prompt/index">Redgate SQL Prompt</a> (formatted the code using the great `CTRL + K, Y` shortcut) once I open the script on SQL Server Management Studio and test the object compilation.

<h4>Other examples?</h4>

I applied the same recipe on scripts with user-defined data types (UDDT). I picked the system data type and created entries to the hashtable with the proper replace.

``` sql
SELECT
       '''\b' + T2.name + '\b'' = "' + T1.name + CASE
                                                     WHEN T2.system_type_id IN (231, 239) THEN '(' + CASE
                                                                                                         WHEN T2.max_length = -1 THEN 'MAX'
                                                                                                         ELSE CAST(T2.max_length / 2 AS VARCHAR(10))
                                                                                                     END + ')'
                                                     WHEN T2.system_type_id IN (175, 167) THEN '(' + CASE
                                                                                                         WHEN T2.max_length = -1 THEN 'MAX'
                                                                                                         ELSE CAST(T2.max_length AS VARCHAR(10))
                                                                                                     END + ')'
                                                     ELSE ''
                                                 END + '"'
  FROM sys.types AS T1
       INNER JOIN sys.types AS T2
          ON T1.user_type_id = T2.system_type_id
 WHERE T2.user_type_id > 256;
```

<h5>Practical example:</h5>

UDDT named `INT_VALUE`, that represents an INT, used in the following way `CAST(column AS INT_VALUE)` needs to be replaced as
`CAST(column as INT)`.

Why we need to do this replace? I have written about it on my blog post <a href="https://claudioessilva.eu/2018/05/02/using-cast-function-with-user-defined-data-types-did-you-know/">Using CAST() function with User-Defined Data Types…Did you know…</a> take a look.

<h2>Wrap up - Life saver and time saved</h2>

Leverage on SQL Server metadata to generate quick code and use it inside SQL Server or outside like I did it here!

I did some math and I have estimated that I would need several months to finish this task doing everything by hand.

Everything could go wrong doing that way:

<ul>
<li>This is an heavely repetitive task</li>
<li>highly prone to errors</li>
<li>a witch hunt when problems arise</li>
</ul>

After all, with this approach I have made in <strong>less than one month</strong>! And, half of those days were to tweak the regular expressions/hashtable.

Automation? You gotta to love it! :-)

Thanks for reading!
