import GestureDescription from "fingerpose/src/GestureDescription"
import { Finger, FingerCurl, FingerDirection } from "fingerpose/src/FingerDescription"

// describe thumbs up gesture 👍
const sideThumbClose = new GestureDescription("side_thumb_close")

sideThumbClose.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0)
sideThumbClose.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 1.0)
sideThumbClose.addDirection(Finger.Index, FingerDirection.HorizontalRight, 1.0)

sideThumbClose.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0)
sideThumbClose.addDirection(Finger.Middle, FingerDirection.HorizontalLeft, 1.0)
sideThumbClose.addDirection(Finger.Middle, FingerDirection.HorizontalRight, 1.0)

sideThumbClose.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0)
sideThumbClose.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.9)
sideThumbClose.addDirection(Finger.Ring, FingerDirection.HorizontalLeft, 1.0)
sideThumbClose.addDirection(Finger.Ring, FingerDirection.HorizontalRight, 1.0)

sideThumbClose.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0)
sideThumbClose.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.9)
sideThumbClose.addDirection(Finger.Pinky, FingerDirection.HorizontalLeft, 1.0)
sideThumbClose.addDirection(Finger.Pinky, FingerDirection.HorizontalRight, 1.0)

sideThumbClose.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0)
sideThumbClose.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 1.0)

export default sideThumbClose
