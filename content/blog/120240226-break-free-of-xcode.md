---
tags: blog
title: Breaking free of XCode
published: 120240226
---

# Breaking free of XCode

I have revisited Swift development on and off, again and again for several years now. The isse is that while I **really** like the language, the build/code environment really anoys me.

Since I replaced [VSCode]() with [Neovim]() now this gets even worse since I have grown even more unfirgiving against bad application design that hinders my flow. 

The way Swift and mainly UIKit is tighly integrated with what appears to be the most hated code editor out there has always been strange to me and I have made several attempts to rectify this and have some possibility to create applications with whatever code editor and build environment I choose. These efforts sadly always ended in a very big and unusable mess.

But now two things changed and so I amm trying again:

1. The Swift package system has matured since I played with Swift last time. So it is actually viuable now to maintain a Swift project without the need for XCode's own convoluted formats.
2. I have found a key insight into how Apps on macOs get booted from within the App itself in [this wonderful blog post]() (🙏)

I am now able to develop Swift apps from neovim (with a working LSP, yes) and start the app from the terminal, simply using `swift run`. And the code to all of this really isn't to convoluted. It's basically one `main.swift` file that handles an `AppDeletage` and a `WindowDelegate` around your usual view construct like so:

```swift
import AppKit
import SwiftUI

struct HelloView: View {
    // Do your thing in here...
}

class MyWindowDeletate: NSObject, NSWindowDelegate {
    func windowWillClose(_: Notification) {
        NSApplication.shared.terminate(0)
    }
}

class MyAppDelegate: NSObject, NSApplicationDelegate {
    let window = NSWindow()
    let winDelegate = MyWindowDeletate()

    func applicationDidFinishLaunching(_ n: Notification) {
        let appMenu = NSMenuItem()
        appMenu.submenu = NSMenu()
        appMenu.submenu?.addItem(NSMenuItem(
            title: "Quit",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        ))
        let menu = NSMenu()
        menu.addItem(appMenu)
        NSApplication.shared.mainMenu = menu

        let size = CGSize(width: 480, height: 270)
        window.setContentSize(size)
        window.styleMask = [.closable, .resizable, .titled]
        window.delegate = winDelegate
        window.title = "Whazzup!"

        let view = NSHostingView(rootView: HelloView())
        view.frame = CGRect(origin: .zero, size: size)
        view.autoresizingMask = [.height, .width]
        window.contentView!.addSubview(view)

        window.center()
        window.makeKeyAndOrderFront(window)

        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}

// this is the magic words that I have not been able to piece together myself. 🙈
let app = NSApplication.shared
let delegate = MyAppDelegate()
app.delegate = delegate
app.run()

```


## but... tmux... 

Jep. That cost me some hair and I still do not have a way around this, so I am currently running the `swift run` command outside of tmux.

For some reason tmux is stealing the focus very agressively. Meaning that, when I start a debug run of any Swift gui app from within tmux, I cannot interact with the app in any way, since tmux simply **will not let go of the focus**.

So maybe thats a headache for another time.

For Now I am glad that I can simply get into some sort of flow-coding state with Swift and maybe there will also be a solution for tmux along the way.


✌️  - Josh
