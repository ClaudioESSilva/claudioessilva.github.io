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
This month’s (#127) T-SQL Tuesday is brought by [B](https://sqlstudies.com/) \| [T](https://twitter.com/sqlstudent144)) and he asked about Non SQL Tips and tricks.
[![(TSQL2sDay)](/img/2017/09/tsql2sday.jpg)](https://sqlstudies.com/2020/06/02/tsql-tuesday-127-invite-non-sql-tips-and-tricks/)

As a Windows user I know there are lots of shortcuts and small hacks, that I love, which make my life much easier!
Here is my small contribution:

## Windows tips &amp; tricks and shortcuts

* `WIN + X` -> to access a lot of management stuff in a quick way
* `WIN + V` -> If you looking for a clipboard manager (keep multiple entries) since Windows 10 (build 1809) we can have it natively. However, I keep using [ClipX](https://bluemars.org/clipx/).
* `WIN + [0-9]` -> The number is linked to the position of the apps on your taskbar.
* `WIN + .` -> Big fan of emoticons? Select one from this list
* Open PowerShell (or cmd) console from a windows explorer window. How many times have you wanted to jump to the PowerShell console already on a specific folder that you have already open on the windows explorer? Just type on the address bar "PowerShell" and a new PowerShell session will open right on that location.

### Open "Add or Remove programs"

A way to open the "Add or Remove programs" menu quicker, you can `SHIFT + DEL` on the shortcut (example: Docker Desktop) on desktop and the prompt popup will have there a link to this option.
![addremoveprogramshortcut](/img/2019/06/addremoveprogramshortcut.png)

#### The ones I use without thinking

* `WIN + R` -> to open the run window
* `WIN + L` -> Want to lock your PC? Instead of CTRL + ALT + DEL...ENTER
* `WIN + E` -> Open new Windows Explorer window.
* `WIN + P` -> Handy when you have more screens connected.
* `WIN + SHITF + (Arrow)` -> To move Windows between screens. You can use without shift to anchor the window on the current screen `` right or up to maximize and down to restore. Down again will minimize. use the `WIN + [0+9]` to put it back on the screen.
* `CTRL + SHIFT + ESCAPE` -> System is unresponsive? Use this shortcut to open the task manager.
* `ALT (+ SHIFT) + TAB` - Toggle between windows. With SHIFT toggle backwards. (You can also use, WIN + TAB)
* `ALT + TAB + CLICK` -> ALT + TAB will open a list of open programs, instead move back/forward with TAB multiple times, you can use your mouse and click on the program you want.
* `ALT + SHIFT` -> Change keyboard language. I can't say how many times this bite me before! Typing passwords and not working..why? Keyboard language/layout has changed how? Probably you pressed ALT + SHIFT.

## Bonus - Search for PowerShell commands used before

Sometimes we want to search for a command that we have used before to run it again. With CTRL + R you can search on executed command's history. Start typing for searching by commands you have run before.
Not the correct entry? Want to search the next/previous entry?
Use `CTRL + R` to search history backwards interactively or `CTRL + S` to Search history forward interactively. This work is done by [PSReadLine](https://github.com/PowerShell/PSReadLine) module. If you are using a recent version of PowerShell you probably have it already.

Thanks for reading!
