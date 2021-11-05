import GestureDescription from "fingerpose/src/GestureDescription"
import { Finger, FingerCurl, FingerDirection } from "fingerpose/src/FingerDescription"

// describe thumbs up gesture 👍
const sideThumbOpen = new GestureDescription("side_thumb_open")

sideThumbOpen.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0)
sideThumbOpen.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 1.0)
sideThumbOpen.addDirection(Finger.Index, FingerDirection.HorizontalRight, 1.0)

sideThumbOpen.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0)
sideThumbOpen.addCurl(Finger.Middle, FingerCurl.HalfCurl, 0.9)
sideThumbOpen.addDirection(Finger.Middle, FingerDirection.HorizontalLeft, 1.0)
sideThumbOpen.addDirection(Finger.Middle, FingerDirection.HorizontalRight, 1.0)

sideThumbOpen.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0)
sideThumbOpen.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.9)
sideThumbOpen.addDirection(Finger.Ring, FingerDirection.HorizontalLeft, 1.0)
sideThumbOpen.addDirection(Finger.Ring, FingerDirection.HorizontalRight, 1.0)

sideThumbOpen.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0)
sideThumbOpen.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.9)
sideThumbOpen.addDirection(Finger.Pinky, FingerDirection.HorizontalLeft, 1.0)
sideThumbOpen.addDirection(Finger.Pinky, FingerDirection.HorizontalRight, 1.0)

sideThumbOpen.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0)
sideThumbOpen.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 1.0)

export default sideThumbOpen
