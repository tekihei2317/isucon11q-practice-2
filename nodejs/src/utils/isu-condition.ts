const conditionLevelInfo = "info";
const conditionLevelWarning = "warning";
const conditionLevelCritical = "critical";

export function isValidConditionFormat(condition: string) {
  const pattern =
    /is_dirty=(true|false),is_overweight=(true|false),is_broken=(true|false)/;
  let myArray = condition.match(pattern);

  return myArray != null;
}

export function calculateConditionLevel(condition: string): [string, Error?] {
  let conditionLevel: string;
  const pattern =
    /is_dirty=(true|false),is_overweight=(true|false),is_broken=(true|false)/;
  let arr = condition.match(pattern) || [];
  let warnCount = 0;
  arr[1] == "true" && warnCount++;
  arr[2] == "true" && warnCount++;
  arr[3] == "true" && warnCount++;
  switch (warnCount) {
    case 0:
      conditionLevel = conditionLevelInfo;
      break;
    case 1: // fallthrough
    case 2:
      conditionLevel = conditionLevelWarning;
      break;
    case 3:
      conditionLevel = conditionLevelCritical;
      break;
    default:
      return ["", new Error("unexpected warn count")];
  }
  return [conditionLevel, undefined];
}
