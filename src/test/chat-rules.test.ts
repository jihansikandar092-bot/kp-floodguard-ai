import { describe, it, expect } from "vitest";
import { chatBody } from "@/lib/assistant/chat";
import { compactChatContext } from "@/lib/assistant/context";

const input = {sessionId:"e50e6598-b557-4729-b34b-2b6424e16a35",chatInput:"Swat risk?",language:"en"};
describe("chat input rules",()=>{
  it("requires UUID session identifiers",()=>{expect(chatBody.safeParse({...input,sessionId:"not-uuid"}).success).toBe(false);expect(chatBody.safeParse(input).success).toBe(true);});
  it("allows 1 to 1000 characters only",()=>{expect(chatBody.safeParse({...input,chatInput:"x"}).success).toBe(true);expect(chatBody.safeParse({...input,chatInput:"x".repeat(1000)}).success).toBe(true);expect(chatBody.safeParse({...input,chatInput:"x".repeat(1001)}).success).toBe(false);expect(chatBody.safeParse({...input,chatInput:" "}).success).toBe(false);});
  it("accepts only English Urdu and Pashto",()=>{for(const language of ["en","ur","ps"]) expect(chatBody.safeParse({...input,language}).success).toBe(true);expect(chatBody.safeParse({...input,language:"fr"}).success).toBe(false);});
  it("includes all five horizons without inventing missing scores",()=>{const result=compactChatContext([],[{id:"swat",name:"Swat"}],[],"en");expect(result.districts[0]?.outlook.map(r=>r.horizon_hours)).toEqual([0,24,48,72,168]);expect(result.districts[0]?.outlook.every(r=>"available" in r && r.available===false)).toBe(true);expect(result.data_time).toBeNull();});
});