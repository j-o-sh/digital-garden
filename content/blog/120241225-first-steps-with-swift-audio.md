---
tags: blog
title: "Devlog: Swift Audio I - Hello AVAudioEngine"
published: 120241225
---

# Hello AVAudioEngine

Remember the [Cassete Experiment](/playground/cassette/)? Yep that was some time ago and I finally got the time and energy to go at it again. This time from the Swift side of things.

After getting lost in permission management and ios complications for way to long I descided to take the most simple approach to get a foot in the door. Remember that this is as much me learning to do audio programming as me learning how Swift works.

So without further ado, let me present the first milestone:

## Record and Replay

The premise is as simple as it gets: Record a short audio clip into memory, using whatever audio device the system provides and replay the recording immediately after.

So I set up a new Swift project using the Swift package manager via `swift package init` and set the platform to macos 13 since apparently I need that as a minimum to have access to the `AVAudioAngine`.

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "cassette-recorder",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(
      url: "https://github.com/apple/swift-argument-parser.git",
      from: "1.2.0"
    )
  ],
  targets: [
    .executableTarget(
      name: "cassette-recorder",
      dependencies: [
        .product(name: "ArgumentParser", package: "swift-argument-parser")
      ]
    )
  ]
)
```

I coded my basic recquirements into the main file of my app, defining that way also how I wanted to define the shape of what I called the engine.

```swift
import ArgumentParser

@main
struct cassette_recorder: ParsableCommand {
  mutating func run() throws {
    print("Testing recording the simplest way possible...")
    print("Preparing the engine...")
    let engine = Engine()

    print("Recording a short audio clip")
    let recording = engine.record10Sec()

    print("Hey Listen...")
    engine.play(recording)

    print("kbythx! ^-^")
  }
}
```


## Hacking Swift Concurrency

My first attempt was to use Swifts [Async/Await](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/) feature to synchronice functions that should work asynchronously on the engine anyway (since it's I/O). But Swift has some restrictions in the way of _save concurency_ which are propably a really good thing that is unfortunatelly wasn't able to easily understand for now.

So instead of going down that rabithole I discovered Swifts semaphore mechanics and opted to synchronise with those instead.

Semaphores are a nice and simple mechanic and Swift provides a simple standard implementation. You just initialize a semaphor as `let semaphore = DispatchSemaphore(value: 0)` which enables to to either await a signal on the semaphor via `semaphore.wait()` or send a signal causing all currently waiting threads to continue on their merry way via `semaphore.signal()`.


## The Jist of Things

So about `AVAudioEngine` the basic learings are that it works via nodes, buffers and callbacks.

`AVAudioEngine` itself already initializes with what's called a `mainMixerNode` for audio output and an `inputNode` that connects to the basic input (like a microphone).

The moment you try to access the inputNode your program will ask the user for permission to do so if you haven't done that explicitely earlier.

```swift
struct Engine {
  private let engine: AVAudioEngine
  private let inputformat: AVAudioFormat

  init() {
    engine = AVAudioEngine()
    // here is where we ask the user
    inputformat = engine.inputNode.inputFormat(forBus: 0)
  }
}
```

The next interestingly new thing to me is the Tap concept. A tap on a node acts a bit like an event listerner that would give you access to all the frames of audio data that would pass through that node since the last time the tap was called.

With that in mind and armed with the semaphore concept from earlier, recording into a buffer looks like this:

```swift
  func record10Sec() -> AVAudioPCMBuffer {
    let capacity = AVAudioFrameCount(inputformat.sampleRate * 10 /*seconds*/)
    let buffer = AVAudioPCMBuffer(pcmFormat: inputformat, frameCapacity: capacity)
    guard let buffer = buffer else { fatalError("🔥 failed to create audio buffer") }

    var currentFrame = 0
    let channelCount = Int(self.inputformat.channelCount)
    let semaphor = DispatchSemaphore(value: 0)

    engine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputformat) {
      slice, _ in
      let remaining = capacity - AVAudioFrameCount(currentFrame)
      let framesToCopy = min(slice.frameLength, remaining)

      if framesToCopy > 0 {
        guard let source = slice.floatChannelData,
          let target = buffer.floatChannelData
        else { fatalError("🔥 corrupt buffer data found") }

        for channel in 0..<channelCount {
          //using memcpy to extract the data into our buffer
          memcpy(
            target[channel] + currentFrame,
            source[channel],
            Int(framesToCopy) * MemoryLayout<Float>.size
          )
        }

        currentFrame += Int(framesToCopy)
        buffer.frameLength = AVAudioFrameCount(currentFrame)
      }

      if currentFrame >= capacity {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        // here the semaphore will resolve
        semaphor.signal()
      }
    }

    do {
      try engine.start()
      // waiting for the semaphore to resolve
      semaphor.wait()
      return buffer
    } catch {
      fatalError("🔥 Failed to start audio engine: \(error)")
    }
  }
```

For the user to hear anything you are doing in the pipeline, the node playing the audio needs to be attached to the `mainMizerNode` of the `AVAudioEngine`. Meaning that we can replay any audio buffer like this:

```swift
  func play(_ buffer: AVAudioPCMBuffer) {
    let semaphor = DispatchSemaphore(value: 0)
    let player = AVAudioPlayerNode()

    // attaching and connecting the player
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: buffer.format)

    player.scheduleBuffer(buffer, at: nil, options: []) { semaphor.signal() }

    do {
      if !engine.isRunning { try engine.start() }
      player.play()
      semaphor.wait()
    } catch {
      fatalError("🔥 Failed to playback: \(error)")
    }
  }
```


## Conclusion

I kinda missed the mark in my first attempts, trying to defeat Apple's App distribution rules and permission handling first but in the end I do like the `AVAudioEngine` approach. For how powerful it seems it still appears very elegant. I only have to test if latency keeps being low enough so that it wont be an issue in the future.

