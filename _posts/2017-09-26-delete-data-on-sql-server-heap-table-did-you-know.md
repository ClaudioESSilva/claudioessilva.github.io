---
layout: post
title: DELETE data on SQL Server HEAP table - Did you know...
date: 2017-09-26 11:00
author: claudiosilva
comments: true
tags: [allocate a new page, DELETE, DidYouKnow..., Heaps, Indexes, SQLServer, syndicated]
---
Before I complete my question let me provide context.

I've received an alert saying that a specific database could not allocate a new page (disk was full)

The message that you will see on the SQL Server Error log is:

<blockquote>Could not allocate a new page for database '' because of insufficient disk space in filegroup ''. Create the necessary space by dropping objects in the filegroup, adding additional files to the filegroup, or setting autogrowth on for existing files in the filegroup.</blockquote>

I didn't know the database structure or what is saved there, so I picked up a script from my toolbelt that shreds all indexes from all table. Just some information like number of rows and space that it is occupying. I have sorted by occupying space in descending order, look what I found...

<a href="https://claudioessilva.github.io/img/2017/09/zero_rows_with_occupying_space.png"><img src="https://claudioessilva.github.io/img/2017/09/zero_rows_with_occupying_space.png" alt="" width="392" height="39" class="aligncenter size-full wp-image-812" /></a>

So...my script has a bug? :-) No, it hasn't!

<h2>The joy of heaps</h2>

<h3>First, the definition:</h3>

<blockquote>A heap is a table without a clustered index. One or more nonclustered indexes can be created on tables stored as a heap. Data is stored in the heap without specifying an order. Usually data is initially stored in the order in which is the rows are inserted into the table, but the Database Engine can move data around in the heap to store the rows efficiently; so the data order cannot be predicted. To guarantee the order of rows returned from a heap, you must use the ORDER BY clause. To specify the order for storage of the rows, create a clustered index on the table, so that the table is not a heap.</blockquote>

Source: <a href="https://docs.microsoft.com/en-us/sql/relational-databases/indexes/heaps-tables-without-clustered-indexes" rel="noopener" target="_blank">MS Docs - Heaps (Tables without Clustered Indexes)</a>

Until now, everything seems normal, it is just a table with unordered data.

<h2>Why am I talking about heaps?</h2>

Not because of table name (was created on propose for this demo), let me show to you the whole row of the script:

<a href="https://claudioessilva.github.io/img/2017/09/heap_empty_occupyingspace_1.png"><img src="https://claudioessilva.github.io/img/2017/09/heap_empty_occupyingspace_1.png?w=656" alt="" width="656" height="33" class="aligncenter size-large wp-image-815" /></a>

<a href="https://claudioessilva.github.io/img/2017/09/heap_empty_occupyingspace_2.png"><img src="https://claudioessilva.github.io/img/2017/09/heap_empty_occupyingspace_2.png?w=656" alt="" width="656" height="32" class="aligncenter size-large wp-image-816" /></a>

Do you have a clue? Yup, `index_id = 0`. That means that our table does not have a clustered index defined and therefore it is an HEAP.

<h3>Even so, how it is possible? 0 rows but occupying several MB...</h3>

The answer is...on the documentation :-)

<blockquote>When rows are deleted from a heap the Database Engine may use row or page locking for the operation. As a result, the pages made empty by the delete operation remain allocated to the heap. When empty pages are not deallocated, the associated space cannot be reused by other objects in the database.</blockquote>

source: <a href="https://docs.microsoft.com/en-us/sql/t-sql/statements/delete-transact-sql" rel="noopener" target="_blank">DELETE (Transact-SQL) - Locking behavior</a>

That explains it!

<h3>So...what should I do in order to get my space back when deleting from a HEAP?</h3>

On the same documentation page we can read the following:

<blockquote>To delete rows in a heap and deallocate pages, use one of the following methods.
<ul><li>Specify the TABLOCK hint in the DELETE statement. Using the TABLOCK hint causes the delete operation to take an exclusive lock on the table instead of a row or page lock. This allows the pages to be deallocated. For more information about the TABLOCK hint, see Table Hints (Transact-SQL).</li>
<li>Use TRUNCATE TABLE if all rows are to be deleted from the table.</li>
<li>Create a clustered index on the heap before deleting the rows. You can drop the clustered index after the rows are deleted. This method is more time consuming than the previous methods and uses more temporary resources.</li></ul></blockquote>

Following the documentation, it suggest we can to use the TABLOCK hint in order to release the empty pages when deleting the data.
Example:
``` sql
DELETE
  FROM dbo.Heap WITH (TABLOCK)
```

<h3>What if I didn't that way or if anyone else run a DELETE without specify it?</h3>

You can rebuild your table using this syntax (since SQL Server 2008):
``` sql
ALTER TABLE dbo.Heap REBUILD
```

This way, the table will release the empty pages and you will recovery the space to use on other objects in the database.

<a href="https://claudioessilva.github.io/img/2017/09/heap_after_rebuild.png"><img src="https://claudioessilva.github.io/img/2017/09/heap_after_rebuild.png" alt="" width="314" height="36" class="aligncenter size-full wp-image-818" /></a>

<h2>Wrap up</h2>

I hope that with this little post you understood how and why a HEAP can have few rows or even zero but still occupy lots of space. Also I have mentioned two ways to solve this problem.
Also, I have found databases with dozens of HEAPS almost empty or even empty that were occupying more than 50% of the total space allocated to the database. And guess what? People where complaining about space.

To finish, I need to complete the title, Did you know...you should use TABLOCK hint when deleting data from a HEAP?

Thanks for reading!
