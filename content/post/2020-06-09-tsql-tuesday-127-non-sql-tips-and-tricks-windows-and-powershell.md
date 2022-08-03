---
author: claudiosilva
comments: true
date: "2020-06-09T00:00:00Z"
tags:
- DidYouKnow
- PowerShell
- shortcuts
- syndicated
- tips &amp; tricks
- TSQL2sDay
title: "TSQL Tuesday 127 - Non SQL Tips and Tricks - Windows"
---
This month’s (#127) T-SQL Tuesday is brought by <a href="https://sqlstudies.com/2020/06/02/tsql-tuesday-127-invite-non-sql-tips-and-tricks/">Kenneth Fisher</a> (<a href="https://sqlstudies.com/">B</a> \| <a href="https://twitter.com/sqlstudent144">T</a>) and he asked about Non SQL Tips and tricks.
<img src="https://claudioessilva.github.io/img/2017/09/tsql2sday.jpg" alt="https://sqlstudies.com/2020/06/02/tsql-tuesday-127-invite-non-sql-tips-and-tricks/" width="244" height="244" class="aligncenter size-full wp-image-599" />

As a Windows user I know there are lots of shortcuts and small hacks, that I love, which make my life much easier!
Here is my small contribution:

<h2>Windows tips &amp; tricks and shortcuts</h2>

<ul>
<li>`WIN + X` -> to access a lot of management stuff in a quick way</li>
<li>`WIN + V` -> If you looking for a clipboard manager (keep multiple entries) since Windows 10 (build 1809) we can have it natively. However, I keep using <a href="https://bluemars.org/clipx/">ClipX</a>.</li>
<li>`WIN + [0-9]` -> The number is linked to the position of the apps on your taskbar.</li>
<li>`WIN + .` -> Big fan of emoticons? Select one from this list</li>
<li>Open PowerShell (or cmd) console from a windows explorer window. How many times have you wanted to jump to the PowerShell console already on a specific folder that you have already open on the windows explorer? Just type on the address bar "PowerShell" and a new PowerShell session will open right on that location.</li>
</ul>

<h3>Open "Add or Remove programs"</h3>

A way to open the "Add or Remove programs" menu quicker, you can `SHIFT + DEL` on the shortcut (example: Docker Desktop) on desktop and the prompt popup will have there a link to this option.
<img src="https://claudioessilva.github.io/img/2020/06/addremoveprogramshortcut.png" alt="" width="490" height="312" class="aligncenter size-full wp-image-2166" />

<h4>The ones I use without thinking</h4>

<ul>
<li>`WIN + R` -> to open the run window</li>
<li>`WIN + L` -> Want to lock your PC? Instead of CTRL + ALT + DEL...ENTER</li>
<li>`WIN + E` -> Open new Windows Explorer window.</li>
<li>`WIN + P` -> Handy when you have more screens connected.</li>
<li>`WIN + SHITF + (Arrow)` -> To move Windows between screens. You can use without shift to anchor the window on the current screen `` right or up to maximize and down to restore. Down again will minimize. use the `WIN + [0+9]` to put it back on the screen.</li>
<li>`CTRL + SHIFT + ESCAPE` -> System is unresponsive? Use this shortcut to open the task manager.</li>
<li>`ALT (+ SHIFT) + TAB` - Toggle between windows. With SHIFT toggle backwards. (You can also use, WIN + TAB)</li>
<li>`ALT + TAB + CLICK` -> ALT + TAB will open a list of open programs, instead move back/forward with TAB multiple times, you can use your mouse and click on the program you want.</li>
<li>`ALT + SHIFT` -> Change keyboard language. I can't say how many times this bite me before! Typing passwords and not working..why? Keyboard language/layout has changed how? Probably you pressed ALT + SHIFT. </li>
</ul>

<h2>Bonus - Search for PowerShell commands used before</h2>

Sometimes we want to search for a command that we have used before to run it again. With CTRL + R you can search on executed command's history. Start typing for searching by commands you have run before.
Not the correct entry? Want to search the next/previous entry?
Use `CTRL + R` to search history backwards interactively or `CTRL + S` to Search history forward interactively. This work is done by <a href="https://github.com/PowerShell/PSReadLine">PSReadLine</a> module. If you are using a recent version of PowerShell you probably have it already.

Thanks for reading!
