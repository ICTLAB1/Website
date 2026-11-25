#!/usr/bin/env python3
"""Builds prisma/content-migrations/fortinet-series.generated.ts from scripts/data/fortinet-hardware-sources.json,
the model names Fortinet lists on its own product pages. Descriptions are written here per kind of product from
what Fortinet's tier headings and product-family labels say - never from a specification."""
import json,re
S=json.load(open("scripts/data/fortinet-hardware-sources.json"))
out=[]
def slug(n): return "fortinet-"+re.sub(r"[^a-z0-9]+","-",n.lower()).strip("-")
def add(name,short,area,use,factors,feat,keywords):
    prod=f"Fortinet {name}"
    out.append({"slug":slug(name),"name":prod,"category":"networking","shortDescription":short.replace("{p}",prod),
     "description":f"{prod} is part of Fortinet's published range for {area}. {use}\n\nModels, part numbers and configurations differ, and Fortinet hardware is bought by exact model, security subscription bundle and support level. We settle {factors} with you and quote the hardware, the subscriptions and the support contract together on a written quotation with a GST invoice.",
     "features":[feat,"Models quoted to your requirement","Quoted with the security subscriptions and support Fortinet requires","Hardware, subscriptions and support on one written quotation"],
     "compatibility":["Fortinet Security Fabric products","Standard IP networks"],
     "keywords":[prod,f"{prod} price India","Fortinet India"]+keywords})
TIER={"entry":("Entry-level (branch)","branch offices and small sites","a next-generation firewall for branch and small-site deployments","the number of users, the internet link speed and the security services you want switched on","Next-generation firewall for branch and small sites"),
      "mid":("Mid-range (campus)","campus and mid-sized sites","a next-generation firewall for campus and mid-sized deployments","throughput with the security services switched on, the number of users and VPN tunnels and the interfaces required","Next-generation firewall for campus and mid-sized sites"),
      "high":("High-end (data centre)","data-centre and large-network deployments","a next-generation firewall for data-centre, carrier and large-enterprise deployments","throughput, port speeds and density, redundancy and the interfaces required","Next-generation firewall for data centres and large networks")}
for tier,models in S["fortigate"].items():
    label,where,use,factors,feat=TIER[tier]
    for m in models:
        add(f"FortiGate {m}",f"{{p}} is a FortiGate next-generation firewall in Fortinet's {label.lower()} range.",f"next-generation firewalls ({label.lower()})",f"Fortinet lists it among its FortiGate models for {where}: {use}.",factors,feat,["FortiGate",f"FortiGate {m} price India","Fortinet firewall India"])
for m in S["fortigateRugged"]:
    add(f"FortiGate Rugged {m}",f"{{p}} is a ruggedised FortiGate next-generation firewall for industrial and outdoor sites.","ruggedised next-generation firewalls","It is a FortiGate built for industrial and operational-technology sites, in a housing made for harsher conditions than an office.","the environment, power input, the interfaces and the protocols in use","Ruggedised firewall for industrial sites",["FortiGate Rugged","Fortinet rugged firewall"])
for m in S["fortiswitchRugged"]:
    add(f"FortiSwitch Rugged {m}",f"{{p}} is a ruggedised FortiSwitch Ethernet switch for industrial sites.","ruggedised Ethernet switching","It is a FortiSwitch built for industrial and outdoor sites, in a housing made for temperature, vibration and dust.","the environment, mounting, port mix and Power over Ethernet needs","Ruggedised switch for industrial sites",["FortiSwitch Rugged","Fortinet industrial switch"])
for m in S["fortiextender"]:
    add(f"FortiExtender {m}",f"{{p}} is a FortiExtender 5G/LTE wireless WAN unit.","5G and LTE wireless WAN","FortiExtender units add a cellular WAN link, as primary or backup connectivity, to a site connected to a FortiGate.","the cellular technology required, the antennas and mounting and the FortiGate in use","5G/LTE wireless WAN link",["FortiExtender","Fortinet 5G LTE"])
KIND={"switch":"Fortinet's Ethernet switches, managed from a FortiGate or from the cloud, for campus, branch and data-centre access and aggregation","ap":"Fortinet's wireless access points for offices, campuses and high-density venues","mgmt":"a Fortinet product line sold as appliances and as virtual machines","sec":"a Fortinet security product line sold as appliances and as virtual machines","voice":"Fortinet's business phone systems and handsets","video":"Fortinet's network cameras and video recorders"}
for fam,area,k in S["families"]:
    add(fam,f"{{p}} is Fortinet's range for {area}.",area,f"{fam} is {KIND[k]}.","the number of users or devices, the model and its capacity, and whether you want an appliance or a virtual machine" if k in("mgmt","sec") else "the number of ports, devices or users and the model and its capacity","Fortinet "+area,[fam])
out.sort(key=lambda p:p["slug"])
assert len({p["slug"] for p in out})==len(out)
hdr="// Generated by scripts/build-fortinet-series.py from scripts/data/fortinet-hardware-sources.json. Do not edit by hand.\n"
open("prisma/content-migrations/fortinet-series.generated.ts","w").write(hdr+"export type FortinetSeries = { slug: string; name: string; category: \"networking\"; shortDescription: string; description: string; features: string[]; compatibility: string[]; keywords: string[] };\n\nexport const FORTINET_SERIES: FortinetSeries[] = "+json.dumps(out,indent=1,ensure_ascii=False)+";\n")
print(len(out))
