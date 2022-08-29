---
author: claudiosilva
comments: true
date: "2017-08-30T00:00:00Z"
tags:
- Documentation
- Download
- PowerShell
- SQLServer
- syndicated
title: Offline Microsoft Documentation? Download it!

thumbnailImagePosition: "top"
thumbnailImage: /img/2017/08/maintopic.png
coverImage: /img/2017/08/maintopic.png
metaAlignment: center
coverMeta: out
---
On my last article I shared how we can now [Contribute to Microsoft Documentation](http://claudioessilva.eu/2017/08/28/contribute-to-microsoft-documentation/). Today I bring another quick tip on Microsoft Documentation!

## Download Microsoft Documentation

Did you know that we can download PDF files with Microsoft Documentation?
I did not know until my colleague called my attention to it few days ago.

**Important note:** This tip is not (yet?) available for all Microsoft's product suite. You should confirm if this tip applies to the product you need.

## "Which documentation?"

The one we can find at [docs.microsoft.com](https://docs.microsoft.com).

## Here is why this can be

Nowadays, some of us have access to the internet almost 100% of the time, this help us forget that this may fail. You probably have gone through this, losing the internet access right when you needed to check a document. You know, it can happen.
If it happens, you get stuck because you can't access a small (or not) piece of text that you could have backed up before but you didn't, right?
Were you using the online documentation to understand what a specific field that belongs to an [System Dynamic Management View (DMV)](https://docs.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/system-dynamic-management-views) means? Or, which parameter you need to use to execute a specific system stored procedure?
If you get the pdf, you can continue working offline. Going on a flight? Will you be in a place where you don't have internet access at all?
I think you get the point.

## "I will give it a try, show me how"

The link is located on the bottom left of the page.
![downloadlink](/img/2017/08/downloadlink.png)
This download will not download just the current page. By using the "Download PDF" link you will get all the content that is present on the tree-view under the "filter" box on the left of the page.
![treeview](/img/2017/08/treeview.png)

## Script to download all existing PDF files

From my search exists at least **98** pdf documents (~66mb) exist just for the [Relational Databases](https://docs.microsoft.com/en-gb/sql/relational-databases/database-features) topic. Download them all is not the kind of work I would like to do manually.

### PowerShell for the rescue

I wrote a PowerShell script that make thing a little bit easier.
With this script, you can download all files for a specific topic. You can find and download the script [Get-MSDocs](https://github.com/ClaudioESSilva/SQLServer-PowerShell/blob/master/Download%20MS%20Documentation/Get-MSDocs.ps1) from my GitHub repository, just change the variables and run it.

### Let's see an example

You search for 'sys.dm_exec_sessions' DMV and you find the corresponding page from Microsoft documentation -> [sys.dm_exec_sessions](https://docs.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-sessions-transact-sql)
The image below shows where you find the topic (highlighted in yellow) that you need to setup on the `$topic` variable on the script.

![maintopic](/img/2017/08/maintopic.png)

By setting the variable `$topic = "relational-databases"` this script will download all PDF files for that main topic. I have accomplished that by understanding the [sql-docs GitHub repository](https://github.com/MicrosoftDocs/sql-docs/tree/live/docs/relational-databases) nomenclature.
Each folder in there is the name of one PDF file plus, the current folder 'Relational-Database' in this scenario.
Next, choose the destination by setting it on the `$outputFolder` variable.
As an example for the SQL docs, you have to choose a folder from the [Docs root](https://github.com/MicrosoftDocs/sql-docs/tree/live/docs) at GitHub repository.
If you find any difficulty working with it let me know by writing a comment to this blog post.
Let's say you want to do the same but for Azure - you need to change the URLs too. The script is currently pointing to 'SQL.sql-content' and for Azure is 'Azure.azure-documents'. The way I know this is by clicking on download PDF on one of the pages and read the URL from the PDF.

## Wrap up

I have shown how you can download a copy of the documentation manually but also how to get all existing files for a specific topic.
Also, I explained that this is **not** available for every Microsoft product. For example, [PowerShell docs](https://docs.microsoft.com/en-gb/powershell/scripting/powershell-scripting?view=powershell-5.1) don't have the link to download PDF file on the [docs.microsoft.com site](https://docs.microsoft.com/en-gb/powershell/scripting/powershell-scripting?view=powershell-5.1).
Maybe in the future this will become the standard for every Microsoft's product documentation.
&nbsp;

Thanks for reading
