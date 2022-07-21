export function isValidConditionFormat(condition: string) {
  const pattern = /is_dirty=(true|false),is_overweight=(true|false),is_broken=(true|false)/;
  let myArray = condition.match(pattern);
  // console.log(myArray);

  return myArray != null;
}

// isValidThenSplit("is_dirty=true,is_overweight=false,is_broken=true");
