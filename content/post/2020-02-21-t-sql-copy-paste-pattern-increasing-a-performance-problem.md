---
author: claudiosilva
comments: true
date: "2020-02-21T00:00:00Z"
tags:
- code
- EXISTS
- performance
- Scripting
- SQLServer
- syndicated
- T-SQL
title: T-SQL Copy & Paste Pattern - Increasing a performance problem
---
Disclaimer: The title is my assumption because I saw it in the past happening this way.

This blog post aims to make you remember something: something that is obvious to you, might not be obvious to others.

## Scenario:

A client has a process which consists of a stored procedure that wraps a bunch of other stored procedures.
The process runs for about 10 hours.

## Taking a look...what is running right now?

I was curious about the process, I've seen this running before but never explored the code. After a couple of days of seeing it running for so long, I decided to see what would be the random query I would get executing.

I had some luck and saw one with a pattern that I knew clearly that could be rewritten it and make it faster.

## sp_WhoIsActive to the rescue

If you don't know what `sp_WhoIsActive` (<a href="http://dataeducation.com/about/" rel="noopener" target="_blank">Adam Machanic</a>'s creation) stored procedure is, let me copy the short definition from the <a href="http://whoisactive.com/" rel="noopener" target="_blank">whoisactive.com</a> website:

<blockquote>sp_whoisactive is a comprehensive activity monitoring stored procedure that works for all versions of SQL Server from 2005 through 2017.

You can download it from the <a href="http://whoisactive.com/downloads" rel="noopener" target="_blank">download</a> page or if you use <a href="https://dbatools.io" rel="noopener" target="_blank">dbatools</a> you can use the command that will download it for you and install it. You can read more about it in my previous blog post <a href="https://claudioessilva.eu/2017/12/05/new-version-of-sp_whoisactive-v11-20-is-available-deployed-on-123-instances-in-less-than-1-minute/" rel="noopener" target="_blank">New Version Of sp_WhoIsActive (V11.20) Is Available – Deployed On 123 Instances In Less Than 1 Minute</a>

### Using `sp_WhoIsActive` to get the current running query

``` powershell
EXEC sp_WhoIsActive
```

#### The query

The query that was being run has the following structure

``` sql
SELECT column1
  FROM table1
 WHERE EXISTS (
               SELECT column2 FROM table2 WHERE table2.column1 = table1.column2
              )
   AND (
              EXISTS (SELECT column1 FROM table3 WHERE table3.column1 = table1.column1 AND table3.column2 = @param1 and table3.column3 = 0)
           OR EXISTS (SELECT column1 FROM table3 WHERE table3.column1 = table1.column1 AND table3.column2 = @param2 and table3.column3 = 0)
           OR EXISTS (SELECT column1 FROM table3 WHERE table3.column1 = table1.column1 AND table3.column2 = @param3 and table3.column3 = 0)
           OR EXISTS (SELECT column1 FROM table3 WHERE table3.column1 = table1.column1 AND table3.column2 = @param4 and table3.column3 = 0)
           OR EXISTS (SELECT column1 FROM table3 WHERE table3.column1 = table1.column1 AND table3.column2 = @param5 and table3.column3 = 0)
           OR EXISTS (SELECT column1 FROM table3 WHERE table3.column1 = table1.column1 AND table3.column2 IN (@param6, @param7) and table3.column3 = 0)
       )
```

However this default call does not bring the execution plan, for that you need to run using the `@get_plans` parameter:

``` powershell
EXEC sp_WhoIsActive @get_plans = 1
```

I have copied the XML that contains the sqlplan to <a href="http://sentryone.com/plan-explorer" rel="noopener" target="_blank">SentryOne Plan Explorer</a> and this was what I saw

<img src="https://claudioessilva.github.io/img/2020/02/executionplanpattern-1.jpg" alt="" width="460" height="513" class="aligncenter size-full wp-image-1938" />

Within the red circle we can see a concatenation operator (first one on top left) which will get the result of each EXISTS sub query (8 in total).

If we want to know which outer batch or stored procedure call was issued by the application or user we can use the `@get_outer_command` parameter

``` powershell
EXEC sp_WhoIsActive @get_plans = 1, @get_outer_command = 1
```

However, if we have nested calls, this will not show the current batch or stored procedure where the code of the current query belongs.

To get that we need to use the `@get_full_inner_text` parameter:

``` powershell
EXEC sp_WhoIsActive @get_plans = 1, @get_outer_command = 1, @get_full_inner_text = 1
```

This way, the `sql_text` column will contain the whole batch or stored procedure where the query belongs.

### Back to the query - The pattern

Can you see the pattern? A lot of `OR EXISTS()` conditions. That is odd indeed, it wouldn't be so odd if each `OR EXISTS()` was accessing different tables...oh, wait...they are not :-) and that is where the problem is.

### Easy to improve

We can easily re-write the query without changing the logic or affecting the output data.

I have re-written the code in the following way:

``` sql
SELECT column1
  FROM table1
 WHERE EXISTS (
               SELECT column2 FROM table2 WHERE table2.column1 = table1.column2
              )
   AND EXISTS (
               SELECT column1
                 FROM table3
                WHERE table3.column1 = table1.column1
                  AND (
                           table3.column2 = @param1
                        OR table3.column2 = @param2
                        OR table3.column2 = @param3
                        OR table3.column2 = @param4
                        OR table3.column2 = @param5
                        OR table3.column2 IN (@param6, @param7)
                      )
                  AND table3.column3 = 0
           )
       )
```

This way we will just hit the `table3` once instead of one time per `OR EXISTS()`.

The actual plan seems to have a much better shape:
<img src="https://claudioessilva.github.io/img/2020/02/afterchangesingleorexists.png" alt="" width="592" height="217" class="aligncenter size-full wp-image-1947" />

A different approach would be a single `IN ()` condition with all variables comma separated. However, I preferred this way as it's easy to show to the developement team the differences between now and before.

In fact, when we use the `IN` operator the optimizer will expand it to various `OR` conditions. Example:

<img src="https://claudioessilva.github.io/img/2020/02/predicateexpandstoors.png" alt="" width="497" height="635" class="aligncenter size-full wp-image-1934" />

### Result

With this change, I have improved the query by 99%.
Query went down from ~4340 seconds to less than 30 seconds.

NOTE: The table had ~46M records.

Also, the number of logical reads for the table dive-bombed!

Before (optimizer used a Worktable):

<blockquote>Table 'Worktable'. Scan count 924230, logical reads 1045662012
...
Table 'table3'. Scan count 6, logical reads 4967238
...
SQL Server Execution Times:
   CPU time = 3824887 ms,  elapsed time = 4344872 ms. 

After:

<blockquote>Table 'table3'. Scan count 9, logical reads 829734,
...
SQL Server Execution Times:
   CPU time = 86345 ms,  elapsed time = 26074 ms.

This means that on the whole process we have saved 1h!

### How'd this happen?

As said in my title and initial disclaimer, this smells like a copy &amp; paste pattern. Maybe something similar to:

<blockquote>Client: "Hey can we have another validation for a different value?"
Dev: "Sure, it's pretty easy to do so"
Also Dev: *copy &amp; paste existing OR EXISTS () change parameter, commit to source control and push it into QA test (with few data) and it's good to go into PROD.*
Client: "Thanks it's working just a little bit slower but today things are slower in general"

## Wrap

When you find these kind of patterns, invest a couple of minutes to test it with better logic.
You may end saving a "couple" of CPU cycles and saving a lot of time.

Thanks for reading!
