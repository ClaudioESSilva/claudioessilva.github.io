---
author: claudiosilva
comments: true
date: "2018-09-12T00:00:00Z"
tags:
- community
- Documentation
- GitHub
- share
- SQLServer
- syndicated
title: 'SQL Server Operations Studio and VSCode: The wrong default datetimeoffset
  format'
---
This post is to answer the question: "You are used to seeing in the format of `yyyy-MM-dd` right?" that I have raised on my blog post <a href="https://claudioessilva.eu/2018/09/04/dont-cutoff-yourself-when-dealing-with-dates-in-t-sql-did-you-know/">Don’t cutoff yourself with dates in T-SQL – Did you know…</a>.

As you could see from that blog post, my screen shots were from [VSCode](https://code.visualstudio.com/) and in this case using [mssql](https://github.com/Microsoft/vscode-mssql) extension, but this happens also on <a href="https://docs.microsoft.com/en-us/sql/sql-operations-studio/download?view=sql-server-2017">SQL Server Operations Studio</a>.

<h3>"But why are my datetimeoffset values on VSCode being showed in that format?" (dd-MMM-yyyy)</h3>

The short answer is because it relies on your regional settings.

This means that whatever settings you have set for your date when you open the VSCode or SQL Operations Studio this will be used to show the output from your `datetimeoffset` columns.

<h3>I'm being specific when I mean `datetimeoffset`</h3>

The `DATETIME` and `DATETIME2` types already display always in `yyyy-MM-dd` format like SQL Server Management Studio.
Once again, remember, I'm talking about default output not if you use a `CAST`, `CONVERT` or `FORMAT` function to manipulate the results.

<h3>How can we fix this?</h3>

When I was looking for this behaviour I did some research and found that a similar problem was raised but regarding `DATETIME2`. You can see it <a href="https://github.com/Microsoft/vscode-mssql/issues/570">here - issue #570</a>.
With this in mind, I decided to open an new <a href="https://github.com/Microsoft/vscode-mssql/issues/1139">issue (#1139) on the vscode-mssql extension repository on GitHub</a> and point to the other one already solved.

If you identify yourself with it, please add your <span class="dashicons dashicons-thumbs-up"></span> to the issue.

Now, we need to wait to see the evolution and, hopefully, a fix will be included on a upcoming release.

<h2>Summary</h2>

Always try to use an unambiguous date format like "yyyy-MM-dd".

Remember, copying things that can have double meaning (incorrect format) can lead to unexpected results like I have shown on the other blog post.

And last but not least, if you think is a bug/missing feature please take the time to fill an issue. It will help you an others for sure!

Thanks for reading!
