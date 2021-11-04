import GestureDescription from "fingerpose/src/GestureDescription"
import { Finger, FingerCurl } from "fingerpose/src/FingerDescription"

// describe thumbs up gesture 👍
const openHandDescription = new GestureDescription("open_hand")

// all other fingers:
// - curled (best)
// - half curled (acceptable)
// - pointing down is NOT acceptable
for (let finger of [Finger.Thumb, Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
  openHandDescription.addCurl(finger, FingerCurl.NoCurl, 1.0)
  //   thumbsUpDescription.addCurl(finger, FingerCurl.HalfCurl, 0.9);
}

export default openHandDescription
