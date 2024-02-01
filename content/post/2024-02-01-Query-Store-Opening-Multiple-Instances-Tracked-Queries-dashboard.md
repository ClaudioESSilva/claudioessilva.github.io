---
author: claudiosilva
comments: true
date: "2024-02-01T11:00:00Z"
tags:
- QueryStore
- SQLServer
- performance
- syndicated
title: "Query Store: How to open multiple instances of the 'Tracked Queries' dashboard"
autoThumbnailImage: false
thumbnailImagePosition: top
thumbnailImage: /img/2024/0201/MutipleTrackedQueriesDashboards.png
coverImage: /img/2024/0201/CoverMutipleTrackedQueriesDashboards.png
metaAlignment: center
coverMeta: out
---

At the beginning of this week, I shared how you can [Search for queries with Query Store GUI](https://claudioessilva.eu/2024/01/29/Search-for-queries-with-Query-Store-GUI/).

Today I want to share something, Query Store related, that bugged me for awhile and a workaround to overcome it.

**NOTE:** This happens at least until SSMS v19.3 (most recent version of SSMS at the time of this writing). Let’s see what newer versions bring us.

## Multiple instances of the same dashboard
When you navigate through Query Store dashboards, it can become handy open two instances of the same dashboard but with a different time range, or different aggreagations or even a different metric so you can do a quick compare.

Here is an image to exemplify it. We have "Avg Elapsed Time" and "Avg Logical Reads" side by side for the same `Tracking query` on two instances of the `Tracked Queries` dashboard.
[![Avg Elapsed Time VS Avg Logical Reads - Side by side](/img/2024/0201/AvgElapsedTimeVSLogicalReads_side_by_side.png)](/img/2024/0201/AvgElapsedTimeVSLogicalReads_side_by_side.png).


## The exception
There is a “design-bug” (in my opinion 😉) with this option when we try it with `Tracked Queries` dashboard.

#### "What do you mean?! I just saw that image!"
Notice that I haven't said it is impossible.  
If you try to open a second instance of the `Tracked Queries` dashboard on the same instance/database **it won't open** but rather change the focus to the existing one.

## The workaround
If you want to have two or more instances of the `Tracked Queries` dashboard you will need to do an in-between step.

1. Open the `Top Resource Consuming Queries` dashboard
![Top Resource Consuming Queries](/img/2024/0201/TopResourceConsumingQueriesDashboard.png)

2. Click on the "Track Selected Query" button (kind of a target icon) on the top right of the 1st bar-graph

![Track Selected Query](/img/2024/0201/ClickOnTrackSelectedQueryButton.png)

This will open a new instance of the `Tracked Queries` dashboard.  
Do you need a third one? Click again on the "Track Selected Query" button.

![Mutiple Tracked Queries Dashboards](/img/2024/0201/MutipleTrackedQueriesDashboards.png)

NOTE: For the first step, you can use some of the other dashboards, as long as they show data. That was the reason to mention the `Top Resource Consuming Queries`.  
No matter how fast your slowest query is, one will need to be the "Top Resource Consuming" query. So the expectation is that on this dashboard you will always get some data.

## Becareful, it can become confusing real quick
As a final note, you can open multiple windows, however be aware that the title on the windows doesn't change.

This is another thing I'm expecting it improve in the future. (Yes, I have provided feedback to the Microsfot folks in-charge 😁)


Hope you find it useful.  
Thanks for reading it.