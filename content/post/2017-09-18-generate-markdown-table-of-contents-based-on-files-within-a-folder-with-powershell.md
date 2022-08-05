---
author: claudiosilva
comments: true
date: "2017-09-18T00:00:00Z"
tags:
- GitHub
- Markdown
- PowerShell
- Table of Contents
- TOC
title: Generate Markdown Table of Contents based on files within a folder with PowerShell
---
Last week I was talking with Constantine Kokkinos ([b</a> \| <a href="https://twitter.com/mobileck" target="_blank" rel="noopener">t](https://constantinekokkinos.com)) about generating a Table Of Contents (TOC) for a GitHub repository.

He wrote a cool blog post - [Generating Tables of Contents for Github Projects with PowerShell](https://constantinekokkinos.com/articles/210/generating-tables-of-contents-for-github-projects-with-powershell) - about it and I will write this one with a different problem/solution.

## Context

I’m working on a new project (news coming soon) that uses a GitHub repository and I expect to have a big number of files within a specific folder.

## Requirement

After some pull requests and merges, I want to update my readme.md file and update the INDEX with this TOC.
For this:

* I want to be able to generate a TOC based on the existing content of a specific folder.
* Each TOC entry must be composed by a name and a link to the .md online file.
* This list must be ordered alphabetically.

Then, I can copy &amp; paste and update the readme.me .
NOTE: For now, I just want a semi-automatic way to do it. Maybe later I will setup Appveyor and make this fully automated :-) ).

## Approach

Get all files with .md extension, order by name and, for each one, generate a line with a link to the GitHub repository .md file.

To do the list I will use the "*" (asterisk) character after a "TAB" to generate a sub list. (This is [Markdown's syntax](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet))

## The code

I have three parameters:

* the `$BaseFolder` - It's the folder's location on the disk
* `$BaseURL` - to build the URL for each file. This will be added as a link
* `$FiletypeFilter` - to filter the files on the folder. In my case I will use "*.md" because I only want markdown files.

The code is:
UPDATE: Thanks to Jaap Brasser ([b](http://www.jaapbrasser.com) \| [t](http://@Jaap_Brasser)) who has contributed to the this code by adding the help and some improvements like dealing with special characters on the URL (spaces). You can find the most recent version of this [Convert-FolderContentToMarkdownTableOfContents.ps1 function here on my GitHub](https://github.com/ClaudioESSilva/SQLServer-PowerShell/blob/master/Convert-FolderContentToMarkdownTableOfContents.ps1)

https://gist.github.com/ClaudioESSilva/12b1d90b64031cb0283bc36180439ede

Running this code pointing to my "NewProject" folder
<img class="aligncenter size-full wp-image-777" src="https://claudioessilva.github.io/img/2017/09/folderstructure.png" alt="" width="549" height="133" />

I will get this output (This have fake links but just to show the output format)

<hr />

## Index

* Modules
* [File1](https://github.com/user/repository/tree/master/Modules/File1.md)
* [OneNewFile](https://github.com/user/repository/tree/master/Modules/OneNewFile.md)
* [OtherFile](https://github.com/user/repository/tree/master/Modules/OtherFile.md)

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

## Final thoughts

This isn't rocket science :-) but it is an idea and a piece of code that will help me and maybe can help you too :-)

Read Constantine's blog post ([Generating Tables of Contents for Github Projects with PowerShell](https://constantinekokkinos.com/articles/210/generating-tables-of-contents-for-github-projects-with-powershell)) to get different ideas.

Thanks for reading
