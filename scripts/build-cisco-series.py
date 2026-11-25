#!/usr/bin/env python3
"""Builds prisma/content-migrations/cisco-series.generated.ts from the series names on Cisco's own
A-Z index (https://www.cisco.com/c/en/us/products/a-to-z-series-index.html), saved as JSON of
[name, href] pairs. Hardware only: management software, voice-gateway software, carrier optical
transport and mobile-core platforms are left out. Descriptions are written here, per kind of
product, from what the series name and Cisco's own category path say — never from a specification."""
import json,re,sys
src=json.load(open(sys.argv[1]))
SKIP={"Integrated Management Controller","Expressway Series","Prime Network Control System Series Appliances","ASR 5000 Series"}
KIND={}
def kind(name,path):
    cat=path.split("/")[5]
    n=name.lower()
    if cat=="optical-networking" or name in SKIP: return None
    if cat=="routers":
        if re.search(r"\b(ir\d|esr|rugged|heavy duty)",n) or n.startswith("catalyst ir") or n.startswith("ir1000"): return "router-industrial"
        if n.startswith(("asr","network convergence")): return "router-core"
        return "router-branch"
    if cat=="switches":
        if re.search(r"rugged|heavy duty|industrial ethernet|embedded|ess9300|ie\d",n): return "switch-industrial"
        if n.startswith(("nexus","n9")): return "switch-dc"
        if n.startswith("business"): return "switch-smb"
        if n.startswith(("catalyst 9","c9")): return "switch-campus"
        if n.startswith("catalyst 1"): return "switch-branch"
        return "switch-generic"
    if cat=="security": return "firewall-industrial" if "industrial" in n else "firewall"
    if cat=="wireless":
        if "controller" in n: return "wlc"
        if re.search(r"heavy duty|rugged",n): return "ap-industrial"
        return "ap"
    if cat=="unified-communications": return "voice-adapter" if n.startswith("ata") else "voice-gateway"
    if cat=="collaboration-endpoints":
        if n.startswith("headset"): return "headset"
        if n.startswith(("board","desk")): return "room-device"
        return "phone"
    if cat=="servers-unified-computing":
        if "fabric interconnect" in n: return "ucs-fabric"
        return "ucs-server"
    if cat=="storage-networking": return "san"
    return None
T={
"router-branch":("branch and WAN-edge routing","Connects branch offices and sites to the WAN and the internet, with security and routing features, for organisations with several locations.","WAN bandwidth, number of sites, the security features required and whether the routers run traditional routing or SD-WAN","Branch and WAN-edge routing"),
"router-industrial":("industrial and field routing","Connects remote, outdoor or factory-floor sites over cellular or wired links, in housings built for harsher conditions than an office.","the environment, power input, the WAN links available on site and the security features required","Built for industrial and field sites"),
"router-core":("service-provider and large-network routing","Aggregates and routes high volumes of traffic in large enterprise, campus-backbone and operator networks.","traffic volume, port speeds, redundancy and the operating software, specified with a network designer","Large-network aggregation and core routing"),
"switch-campus":("campus switching","Connects staff, phones, cameras and access points at the access, distribution or core layer of an office or campus network.","port count, Power over Ethernet budget, uplink speed, stacking and the software licence tier","Campus access, distribution or core switching"),
"switch-branch":("small and branch-office switching","Provides managed switching for small sites, branches and schools that want Cisco switching without a campus-scale design.","port count, Power over Ethernet budget and uplink type","Managed switching for small sites"),
"switch-smb":("small-business switching","Provides switching for small offices, from unmanaged units that simply connect devices to managed ones with VLANs and monitoring.","port count, Power over Ethernet budget and how much management the site needs","Switching for small offices"),
"switch-dc":("data-centre switching","Connects servers and storage inside a data centre and joins its racks in spine-and-leaf designs.","port speeds, port density, the operating mode and the support contract, against the server and storage estate","Data-centre server and uplink switching"),
"switch-industrial":("industrial and embedded switching","Provides switching in factories, substations, transport and outdoor sites, in housings built for temperature, vibration and dust.","the environment, mounting, port mix, Power over Ethernet needs and the industrial protocols in use","Built for industrial environments"),
"switch-generic":("switching","Provides network switching within Cisco's switch portfolio.","port count, speed, Power over Ethernet budget and the software licence","Cisco switching"),
"firewall":("network security","Protects the network edge or the data centre with next-generation firewalling, traffic inspection and VPN.","throughput with inspection switched on, the number of sites and VPN users and the security subscriptions required","Firewall, inspection and VPN"),
"firewall-industrial":("industrial network security","Secures industrial and operational-technology networks with a firewall appliance suited to plant and field conditions.","the environment, the protocols in use and the security features required","Security for industrial networks"),
"ap":("Wi-Fi access","Provides enterprise Wi-Fi in offices, campuses and public venues.","coverage and capacity from a site survey, the Wi-Fi generation and the controller or cloud management in use","Enterprise Wi-Fi access points"),
"ap-industrial":("industrial wireless","Provides Wi-Fi and wireless backhaul in outdoor and industrial sites, in housings built for the conditions.","the environment, antenna and mounting needs and the wireless design","Wireless for outdoor and industrial sites"),
"wlc":("wireless management","Manages a fleet of access points from one place, handling configuration, roaming and policy.","the number of access points and clients and the redundancy required","Wireless controller for access points"),
"voice-adapter":("analog voice","Connects analog telephones and fax machines to an IP voice network.","the number of analog ports and the voice platform in use","Analog telephone adapter for IP voice"),
"voice-gateway":("voice connectivity","Connects an IP voice network to analog and digital telephone lines.","the number and type of telephony ports and the voice platform in use","Voice gateway to telephone lines"),
"phone":("desk telephony","Provides IP desk telephones for offices, with the feature level and firmware chosen to suit the call platform.","the call platform in use, the feature level and the firmware option","IP desk telephone"),
"headset":("calling accessories","Provides headsets for desk and softphone calling.","the call platform, wired or wireless connection and comfort for all-day use","Headset for calling and meetings"),
"room-device":("meeting-room and desk collaboration","Provides video and collaboration endpoints for meeting rooms and desks.","the room size, the meeting platform in use and the cabling and display setup","Collaboration endpoint for rooms and desks"),
"ucs-server":("compute","Provides servers within Cisco's Unified Computing System portfolio, managed alongside the rest of a UCS estate.","processor, memory, storage and network fitting, the form factor and the management platform","Servers in Cisco's UCS portfolio"),
"ucs-fabric":("compute networking","Connects and manages the servers of a UCS domain, carrying their network and storage traffic.","the number of servers, port speeds and the management platform","Network and management fabric for UCS"),
"san":("storage networking","Connects servers to shared storage over a Fibre Channel storage network.","port speeds, port count, redundancy and the storage and server estate","Fibre Channel storage networking"),
}
def slug(name): return "cisco-"+re.sub(r"[^a-z0-9]+","-",name.lower()).strip("-")
CAT={"ucs-server":"servers","ucs-fabric":"servers","san":"storage"}
out=[];seen=set()
for name,href in src:
    if href in seen: continue
    seen.add(href)
    k=kind(name,href)
    if not k: continue
    area,use,factors,feat=T[k]
    prod=f"Cisco {name}"
    out.append({"slug":slug(name),"name":prod,"category":CAT.get(k,"networking"),
     "shortDescription":f"{prod} is part of Cisco's range for {area}.",
     "description":f"{prod} is a series in Cisco's published range, used for {area}. {use}\n\nModels, part numbers and configurations within the series differ, and Cisco hardware is bought by exact part number, licence term and support level. We settle {factors} with you and quote the hardware, any software licence and the support contract together on a written quotation with a GST invoice.",
     "features":[feat,"Models within the series quoted to your requirement","Quoted with software licence and support where Cisco requires them","Hardware, licence and support on one written quotation"],
     "compatibility":["Cisco network, security and collaboration products","Standard networking protocols"],
     "keywords":[prod,f"{prod} price India","Cisco India",f"buy {name}"],
     "sourcePath":href})
out.sort(key=lambda p:p["slug"])
hdr="// Generated by scripts/build-cisco-series.py from Cisco's A-Z series index. Do not edit by hand.\n"
open("prisma/content-migrations/cisco-series.generated.ts","w").write(hdr+"export type CiscoSeries = { slug: string; name: string; category: \"networking\" | \"servers\" | \"storage\"; shortDescription: string; description: string; features: string[]; compatibility: string[]; keywords: string[]; sourcePath: string };\n\nexport const CISCO_SERIES: CiscoSeries[] = "+json.dumps(out,indent=1,ensure_ascii=False)+";\n")
import collections
print(len(out),"products;",dict(collections.Counter(p["category"] for p in out)))
