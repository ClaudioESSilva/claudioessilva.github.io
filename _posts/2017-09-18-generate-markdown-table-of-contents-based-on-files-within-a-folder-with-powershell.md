---
layout: post
title: Generate Markdown Table of Contents based on files within a folder with PowerShell
date: 2017-09-18 14:00
author: claudiosilva
comments: true
tags: [GitHub, Markdown, PowerShell, Table of Contents, TOC]
---
Last week I was talking with Constantine Kokkinos (<a href="https://constantinekokkinos.com" target="_blank" rel="noopener">b</a> \| <a href="https://twitter.com/mobileck" target="_blank" rel="noopener">t</a>) about generating a Table Of Contents (TOC) for a GitHub repository.

He wrote a cool blog post - <a href="https://constantinekokkinos.com/articles/210/generating-tables-of-contents-for-github-projects-with-powershell" target="_blank" rel="noopener">Generating Tables of Contents for Github Projects with PowerShell</a> - about it and I will write this one with a different problem/solution.

<h2>Context</h2>

I’m working on a new project (news coming soon) that uses a GitHub repository and I expect to have a big number of files within a specific folder.

<h2>Requirement</h2>

After some pull requests and merges, I want to update my readme.md file and update the INDEX with this TOC.
For this:

<ul>
    <li>I want to be able to generate a TOC based on the existing content of a specific folder.</li>
    <li>Each TOC entry must be composed by a name and a link to the .md online file.</li>
    <li>This list must be ordered alphabetically.</li>
</ul>

Then, I can copy &amp; paste and update the readme.me .
NOTE: For now, I just want a semi-automatic way to do it. Maybe later I will setup Appveyor and make this fully automated :-) ).

<h2>Approach</h2>

Get all files with .md extension, order by name and, for each one, generate a line with a link to the GitHub repository .md file.

To do the list I will use the "*" (asterisk) character after a "TAB" to generate a sub list. (This is <a href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet" target="_blank" rel="noopener">Markdown's syntax</a>)

<h2>The code</h2>

I have three parameters:

<ul>
    <li>the `$BaseFolder` - It's the folder's location on the disk</li>
    <li>`$BaseURL` - to build the URL for each file. This will be added as a link</li>
    <li>`$FiletypeFilter` - to filter the files on the folder. In my case I will use "*.md" because I only want markdown files.</li>
</ul>

The code is:
UPDATE: Thanks to Jaap Brasser (<a href="http://www.jaapbrasser.com">b</a> \| <a href="http://@Jaap_Brasser">t</a>) who has contributed to the this code by adding the help and some improvements like dealing with special characters on the URL (spaces). You can find the most recent version of this <a href="https://github.com/ClaudioESSilva/SQLServer-PowerShell/blob/master/Convert-FolderContentToMarkdownTableOfContents.ps1" target="_blank" rel="noopener">Convert-FolderContentToMarkdownTableOfContents.ps1 function here on my GitHub</a>

https://gist.github.com/ClaudioESSilva/12b1d90b64031cb0283bc36180439ede

Running this code pointing to my "NewProject" folder
<img class="aligncenter size-full wp-image-777" src="https://claudioessilva.github.io/img//2017/09/folderstructure.png" alt="" width="549" height="133" />

I will get this output (This have fake links but just to show the output format)

<hr />

<h2>Index</h2>

<ul>
<li>Modules</li>
<li><a href="https://github.com/user/repository/tree/master/Modules/File1.md">File1</a></li>
<li><a href="https://github.com/user/repository/tree/master/Modules/OneNewFile.md">OneNewFile</a></li>
<li><a href="https://github.com/user/repository/tree/master/Modules/OtherFile.md">OtherFile</a></li>
</ul>

<hr />

Nice! This has the following code behind:

``` text
## Index
* Modules
  * [File1](https://github.com/user/repository/tree/master/Modules/File1.md)
  * [OneNewFile](https://github.com/user/repository/tree/master/Modules/OneNewFile.md)
  * [OtherFile](https://github.com/user/repository/tree/master/Modules/OtherFile.md)
```

Now, I can copy this markdown code and update my readme.md file.

<h2>Final thoughts</h2>

This isn't rocket science :-) but it is an idea and a piece of code that will help me and maybe can help you too :-)

Read Constantine's blog post (<a href="https://constantinekokkinos.com/articles/210/generating-tables-of-contents-for-github-projects-with-powershell" target="_blank" rel="noopener">Generating Tables of Contents for Github Projects with PowerShell</a>) to get different ideas.

Thanks for reading
