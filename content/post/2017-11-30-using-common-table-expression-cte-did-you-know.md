---
author: claudiosilva
comments: true
date: "2017-11-30T00:00:00Z"
tags:
- CTE; Common table expression
- DidYouKnow
- SQLServer
- syndicated
- TSQL
title: Using Common Table Expression (CTE) - Did you know...
autoThumbnailImage: true
thumbnailImagePosition: "top"
#thumbnailImage: /img/2017/11/output1.png
coverImage: /img/2017/11/output1.png
metaAlignment: center
coverMeta: out
---
Today I will write just a short blog post to do a quick reminder!

I still hear a lot of people suggesting CTEs because they think it works like a temporary table (you populate the table and then it can be/is reutilized).

It doesn't!

From de [documentation](https://docs.microsoft.com/en-us/sql/t-sql/queries/with-common-table-expression-transact-sql):

> Specifies a **temporary** named result set, known as a common table expression (CTE).

Maybe they are focusing on the "**temporary**" word.

Using the CTE two times will perform two different executions! Don't believe me? See the next example!
If we run the following code do you expect to get the same value for both queries? Note: we have a `UNION ALL` between them.

``` sql
WITH cte AS
(
	SELECT NEWID() AS Col1
)
SELECT Col1
  FROM cte
UNION ALL
SELECT Col1
  FROM cte
```

Sorry to disappoint you but it will run the CTE's code twice and return the value(s) from each execution.
As we are using the function NEWID(), two different values will be generated.

![output1](/img/2017/11/output1.png)

To complete the question: "Did you know that CTE's code will be executed as many times as you use it?"

Thanks for reading!
