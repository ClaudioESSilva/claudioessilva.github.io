---
author: claudiosilva
comments: true
date: "2020-02-12T00:00:00Z"
tags:
- ComObject
- InvokeMember
- Mail
- Outlook
- PowerShell
- reflection
- Scripting
- Security
- Sender
- SendUsingAccount
- SetProperty
- syndicated
title: Change Outlook sender mailbox with PowerShell - A workaround
---
The idea of this blog post, like many others I write, is to document a workaround solution to my problem. Hopefully I can also help someone that may be looking for the solution for this problem and stumbles accidentally (or not) on my blog.

## Scenario

I was helping a colleague automating the creation of emails using Microsoft Outlook using PowerShell. The following are configurable options (these will be the parameters of the script):

* list of TO email addresses
* list of CC email addresses
* Signed and Encrypted (they are being forced)
* Subject
* Keep the default signature but add the message before
* Sender can be different that the default (example: use team's email instead the personal one)

We can use the COM object to create Outlook objects.

``` powershell
$Outlook = New-Object -ComObject Outlook.Application
```

We need to get the MAPI namespace and logon on the default profile (or existing session)

``` powershell

#Get the MAPI namespace.

$namespace = $Outlook.GetNameSpace("MAPI")

# Log on by using the default profile or existing session (no dialog box).

$namespace.Logon($null, $null, $false, $true);
```

> Note: To do this you need to be running your PowerShell session with the same privileges. If you are running Outlook as a non-administrator (and you should!) you need to open a PowerShell session with the same privilege level.

Then, we need to create a new Mail item

``` powershell

# Create new email

$Mail = $Outlook.CreateItem(0)
$Mail.GetInspector.Activate()
```

> Note: The second line (`Activate()`) is being used because the mail will not be sent automatically, it will be a manual process after the colleague checks a couple of things. This way, activate will bring the focus to the window and this way we can see the magic happening!

To set the To and CC (which is optional) emails is easy as setting the properties' values.

``` powershell
$Mail.To = $EmailTo
if ($EmailCC) {
   $Mail.Cc = $EmailCC
}
```

Adding the `Subject`

``` powershell
$Mail.Subject = $EmailSubject
```

To sign and/or encrypt the email we need to set like this:

``` powershell

#Sign and Encrypt email

$Mail.PropertyAccessor.SetProperty("http://schemas.microsoft.com/mapi/proptag/0x6E010003", 0x03)
```

The possible values are:

0x00 - Message has no security
0x01 - Message is encrypted
0x02 - Message is signed
0x03 - Message is signed and encrypted

### Keeping the signature

After opening the message we can get the current HTML of the body which will include the default signature (with images, links, etc)

``` powershell

# Get default signature

$signature = $Mail.HtmlBody
```

Then we can just add our `$EmailHtmlBody` parameter and append the `$signature`

``` powershell
$Mail.HtmlBody = $EmailHtmlBody + $signature
```

### The problem

Finally, from our list of properties to be changed we have the sender mailbox.

Using the `SendUsingAccount` property I tried to set the email address that I wanted. But...no luck!

### Using `Get-Member` to know more

I took a closer look and using the `Get-Member` I was able to be sure what data type this property accepts.
![sendingusingaccount_datatype](/img/2020/02/sendingusingaccount_datatype.png)

As we can see it expects an object of type `Account`.

### Now will work, right?!

To get the account as an `account` type I have used the following code where the `$EmailFrom` variable contains the email address I want to use:

``` powershell

#Get account object from email addres

$account = $outlook.Session.Accounts.Item($EmailFrom)
```

> NOTE: You need to have this email address configured on your Outlook, otherwise this will not work.

With our `$account` variable set let's assign it to our `SendUsingAccount` mail object property.

``` powershell
$Mail.SendUsingAccount = $account
```

But...this also didn't work!
All the others properties were pretty easy to change so I didn't expect that.

## Time for some google-fu

After googleing for a bit I found an generic (works for many objects) alternative way to set a property to an object

``` powershell
function Invoke-SetProperty {
    # Auxiliar function to set properties. The SendUsingAccount property wouldn't be set in a different way
    param(
        [__ComObject] $Object,
        [String] $Property,
        $Value
    )
    [Void] $Object.GetType().InvokeMember($Property,"SetProperty",$NULL,$Object,$Value)
}
```

I have put this code as an internal function. So, inside our code we can call it like this:

``` powershell

#Change Sender mailbox

Invoke-SetProperty -Object $mail -Property "SendUsingAccount" -Value $account
```

And finally, it worked!

### Conclusion

In this case we are using [reflection](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/reflection) (by calling InvokeMember()) .Normally we use this, for example, when we want to change private properties of an object. I’m not sure in this case why the “normal” way didn’t work but, at least, this can be used as a workaround for the future in case other similar cases appear.

### The whole function code

You can get the whole function code from [here](https://gist.github.com/ClaudioESSilva/dfaf1de2e5da88fca1e59f70edd7f4ae)

### A final curiosity

Normally when talking about automation one of the things that we measure is how much time we can save when in comparison with all the manual steps. Just to kill the curiosity the best case scenario for a manual process (which includes Excel files) takes 1h, after the automation we went down to 30 seconds. However this is a story for a another day with another blog post. Stay tuned!

Thanks for reading!
