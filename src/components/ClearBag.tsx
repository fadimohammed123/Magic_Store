"use client";

import { useEffect, useState } from "react";

/** After a paid checkout, empty the saved bag. */
export function ClearBag() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try {
      localStorage.removeItem("magic-bag-v2");
    } catch (error) {
      console.error("Could not clear the saved bag after checkout", error);
      setFailed(true);
    }
  }, []);
  return failed ? <p role="status" className="relative mt-6 text-sm text-red">We couldn’t clear the saved bag in this browser. You can remove those items from the bag when you return.</p> : null;
}
