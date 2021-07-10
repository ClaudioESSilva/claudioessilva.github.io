---
layout: post
title: Offline Microsoft Documentation? Download it!
date: 2017-08-30 12:00
author: claudiosilva
comments: true
tags: [Documentation, Download, PowerShell, SQLServer, syndicated]
---
<p style="text-align:justify;">On my last article I shared how we can now <a href="http://claudioessilva.eu/2017/08/28/contribute-to-microsoft-documentation/" target="_blank" rel="noopener">Contribute to Microsoft Documentation</a>. Today I bring another quick tip on Microsoft Documentation!</p>

<h2 style="text-align:justify;">Download Microsoft Documentation</h2>
<p style="text-align:justify;">Did you know that we can download PDF files with Microsoft Documentation?</p>
I did not know until my colleague called my attention to it few days ago.
<p style="text-align:justify;"><strong>Important note: </strong>This tip is not (yet?) available for all Microsoft's product suite. You should confirm if this tip applies to the product you need.</p>

<h2 style="text-align:justify;">"Which documentation?"</h2>
<p style="text-align:justify;">The one we can find at <a href="https://docs.microsoft.com" target="_blank" rel="noopener">docs.microsoft.com</a>.</p>

<h2 style="text-align:justify;">Here is why this can be useful</h2>
<p style="text-align:justify;">Nowadays, some of us have access to the internet almost 100% of the time, this help us forget that this may fail. You probably have gone through this, losing the internet access right when you needed to check a document. You know, it can happen.</p>
<p style="text-align:justify;">If it happens, you get stuck because you can't access a small (or not) piece of text that you could have backed up before but you didn't, right?</p>
<p style="text-align:justify;">Were you using the online documentation to understand what a specific field that belongs to an <a href="https://docs.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/system-dynamic-management-views" target="_blank" rel="noopener">System Dynamic Management View (DMV)</a> means? Or, which parameter you need to use to execute a specific system stored procedure?</p>
<p style="text-align:justify;">If you get the pdf, you can continue working offline. Going on a flight? Will you be in a place where you don't have internet access at all?</p>
<p style="text-align:justify;">I think you get the point.</p>

<h2 style="text-align:justify;">"I will give it a try, show me how"</h2>
<p style="text-align:justify;">The link is located on the bottom left of the page.</p>
<p style="text-align:justify;">![downloadlink](/img/2017/08/downloadlink.png)
<p style="text-align:justify;">This download will not download just the current page. By using the "Download PDF" link you will get all the content that is present on the tree-view under the "filter" box on the left of the page.</p>
![treeview](/img/2017/08/treeview.png)


<h2 style="text-align:justify;">Script to download all existing PDF files</h2>
<p style="text-align:justify;">From my search exists at least <strong><span style="text-decoration:underline;">98</span></strong> pdf documents (~66mb) exist just for the <a href="https://docs.microsoft.com/en-gb/sql/relational-databases/database-features" target="_blank" rel="noopener">Relational Databases</a> topic. Download them all is not the kind of work I would like to do manually.</p>

<h3 style="text-align:justify;">PowerShell for the rescue</h3>
<p style="text-align:justify;">I wrote a PowerShell script that make thing a little bit easier.</p>
<p style="text-align:justify;">With this script, you can download all files for a specific topic. You can find and download the script <a href="https://github.com/ClaudioESSilva/SQLServer-PowerShell/blob/master/Download%20MS%20Documentation/Get-MSDocs.ps1" target="_blank" rel="noopener">Get-MSDocs</a> from my GitHub repository, just change the variables and run it.</p>

<h3>Let's see an example</h3>
<p style="text-align:justify;">You search for 'sys.dm_exec_sessions' DMV and you find the corresponding page from Microsoft documentation -&gt; <a href="https://docs.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-sessions-transact-sql" target="_blank" rel="noopener">sys.dm_exec_sessions</a></p>
<p style="text-align:justify;">The image below shows where you find the topic (highlighted in yellow) that you need to setup on the `$topic` variable on the script.</p>
![maintopic](/img/2017/08/maintopic.png)
<p style="text-align:justify;">By setting the variable `$topic = "relational-databases"` this script will download all PDF files for that main topic. I have accomplished that by understanding the <a href="https://github.com/MicrosoftDocs/sql-docs/tree/live/docs/relational-databases" target="_blank" rel="noopener">sql-docs GitHub repository</a> nomenclature.</p>
<p style="text-align:justify;">Each folder in there is the name of one PDF file plus, the current folder 'Relational-Database' in this scenario.</p>
Next, choose the destination by setting it on the `$outputFolder` variable.
<p style="text-align:justify;">As an example for the SQL docs, you have to choose a folder from the <a href="https://github.com/MicrosoftDocs/sql-docs/tree/live/docs" target="_blank" rel="noopener">Docs root</a> at GitHub repository.</p>
<p style="text-align:justify;">If you find any difficulty working with it let me know by writing a comment to this blog post.</p>
Let's say you want to do the same but for Azure - you need to change the URLs too. The script is currently pointing to 'SQL.sql-content' and for Azure is 'Azure.azure-documents'. The way I know this is by clicking on download PDF on one of the pages and read the URL from the PDF.
<h2 style="text-align:justify;">Wrap up:</h2>
<p style="text-align:justify;">I have shown how you can download a copy of the documentation manually but also how to get all existing files for a specific topic.</p>
<p style="text-align:justify;">Also, I explained that this is <strong>not</strong> available for every Microsoft product. For example, <a href="https://docs.microsoft.com/en-gb/powershell/scripting/powershell-scripting?view=powershell-5.1" target="_blank" rel="noopener">PowerShell docs</a> don't have the link to download PDF file on the <a href="https://docs.microsoft.com/en-gb/powershell/scripting/powershell-scripting?view=powershell-5.1" target="_blank" rel="noopener">docs.microsoft.com site</a>.</p>
<p style="text-align:justify;">Maybe in the future this will become the standard for every Microsoft's product documentation.</p>
&nbsp;

Thanks for reading
