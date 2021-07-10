---
layout: post
title: Did you know...you can change the default file encoding for new query on SSMS?
date: 2018-06-05 15:30
author: claudiosilva
comments: true
tags: [Did You Know, DidYouKnow..., Encoding, SQL Server Tip, SQLServer, SSMS, syndicated]
---
If you have been reading my last blog posts, you know that I’m currently working on a SQL code migration from Firebird to SQL Server.

The client provided the scripts with all modules (Stored Procedures, functions, etc) and the steps I'm following (roughly speaking) for converting are:

<ol>
<li>Open new query window</li>
<li>Copy and paste de object code</li>
<li>Save the file
This is how the file look like:
<img src="https://claudioessilva.github.io/img//2018/06/savedwithdefaultencoding_ansi1.png?w=300" alt="" width="300" height="53" class="aligncenter size-medium wp-image-1458" /></p></li>
<li><p>Run a PowerShell script that does a find and replace based on a hashtable. Apply all the changes and save the file again.</p></li>
<li><p>The file refresh on SSMS
This is how the file look like after the find and replace:
<img src="https://claudioessilva.github.io/img//2018/06/afterfindreplacepowershellandsaveasutf81.png?w=300" alt="" width="300" height="43" class="aligncenter size-medium wp-image-1457" /></p></li>
<li><p>Unicode characters are broken :-(</p></li>
</ol>

<h3>So...what is happening?</h3>

<p>The file that is used to create a new query window has ANSI encoding but when I save the file on the PowerShell script I save it as UTF-8 because the client have comments on the code with unicode characters.

On this process, the unicode characters are replaced by some symbols.

<h3>How to solve?</h3>

We can change the default file encoding in order to be the one we want in the first place. What I have done was change from ANSI encoding to UTF-8.

This way, when use the keyboard shortcut `CTRL + N` to open a new window and hit Save, I'm saving as UTF-8 which means that the PowerShell script will do the find and replace, save the file and <strong>preserve</strong> the unicode characters. :-)

<h3>Where is that default file?</h3>

My path to the file is `C:\Program Files (x86)\Microsoft SQL Server\140\Tools\Binn\ManagementStudio\SqlWorkbenchProjectItems\Sql` where the 140 stands for the SSMS v17 (in my case, right know I'm using the v17.5).
Inside this folder we can find the file `SQLFile.sql`.

We just need to open it, for example with notepad, do the `Save As` and choose the encoding we want.

Now if you go to the SSMS, open a new query window and hit save, you can confirm that the file is saved by default with the new encoding you have setup.

With this I have eliminated one tedious step that forced me to do the `Save As` and choose the UTF-8 every single file I wanted to save. I have hundreds of objects so, this small improvement times hundreds of iterations save me a good amount of time!

Thanks for reading.
