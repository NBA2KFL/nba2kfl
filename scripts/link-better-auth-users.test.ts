import { describe, expect, it } from "vitest";
import { parseUserPasswordRows } from "./link-better-auth-users";

describe("parseUserPasswordRows", () => {
  it("extracts generated users from a markdown table", () => {
    const rows = parseUserPasswordRows(`
# Generated users

| Nom | Email | Mot de passe |
| --- | --- | --- |
| Anna | ANNA@NBA2KFL.LOCAL | \`secret-one\` |
| Mat Presti | mat.presti@nba2kfl.local | \`secret-two\` |
`);

    expect(rows).toEqual([
      {
        name: "Anna",
        email: "anna@nba2kfl.local",
        password: "secret-one"
      },
      {
        name: "Mat Presti",
        email: "mat.presti@nba2kfl.local",
        password: "secret-two"
      }
    ]);
  });
});
