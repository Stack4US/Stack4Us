function isAuth() {
  const result = localStorage.getItem("Auth") || null;
  const resultBool = result === "true";
  return resultBool;
}

export default isAuth;