import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "PRINCIPAL" | "DISBURSING_OFFICER";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "PRINCIPAL" | "DISBURSING_OFFICER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "PRINCIPAL" | "DISBURSING_OFFICER";
  }
}