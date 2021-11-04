import GestureDescription from "fingerpose/src/GestureDescription"
import { Finger, FingerCurl } from "fingerpose/src/FingerDescription"

// describe thumbs up gesture 👍
const closedHandDescription = new GestureDescription("closed_hand")

for (let finger of [Finger.Thumb, Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  closedHandDescription.addCurl(finger, FingerCurl.FullCurl, 1.0)
  closedHandDescription.addCurl(finger, FingerCurl.HalfCurl, 0.9)
}

export default closedHandDescription
