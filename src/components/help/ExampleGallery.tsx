import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface ExampleItem {
  id: string;
  category: string;
  title: string;
  description: string;
  line242: string;
  line244: string;
  line246: string;
  whyItQualifies: string[];
}

const examples: ExampleItem[] = [
  // SOFTWARE EXAMPLES
  {
    id: "software-1",
    category: "software",
    title: "Distributed Cache Consistency",
    description: "Building a cache synchronization system for microservices",
    line242: "Our distributed system required maintaining cache consistency across 15+ microservices without introducing unacceptable latency. Standard approaches like Redis pub/sub introduced 200ms+ delays. We couldn't find an existing solution that maintained sub-50ms synchronization while handling 100K+ requests/second. The technological uncertainty was whether we could achieve real-time consistency without sacrificing throughput or requiring expensive infrastructure.",
    line244: "We tested 4 approaches: (1) polling with 100ms intervals—failed, caused cache stampedes; (2) CRDT-based eventual consistency—achieved 45ms sync but consumed 3x memory; (3) custom binary protocol over UDP multicast—packet loss >5%; (4) hybrid approach combining CRDTs with ordered event streams. Final solution used vector clocks for causality tracking plus bloom filters for change detection. Benchmarked under simulated production load (120K req/s, 8 regions). Measured sync latency, memory overhead, and consistency violations across 72-hour stress tests.",
    line246: "Proved that hybrid CRDT + event stream architecture can maintain <40ms cache consistency at scale without excessive memory cost. Documented that bloom filter false-positive rate of 0.1% is acceptable for cache use cases. Our findings demonstrate this approach is viable for high-throughput distributed systems, advancing the field's understanding of real-time data consistency patterns.",
    whyItQualifies: [
      "Uncertainty: No existing solution met sub-50ms consistency at 100K+ req/s scale",
      "Investigation: Systematically tested 4 architectures with quantified results",
      "Advancement: Proved hybrid CRDT+stream approach viable, documented acceptable trade-offs"
    ]
  },
  {
    id: "software-2",
    category: "software",
    title: "WebAssembly Video Codec",
    description: "Porting H.265 decoder to browser-based WASM",
    line242: "H.265 video decoding in browsers required either native extensions or slow JavaScript implementations. WebAssembly promised near-native performance, but no production-grade H.265 WASM decoder existed. The core uncertainty: could WASM achieve real-time 4K decoding (60fps) given its limited SIMD support and memory constraints? Standard FFmpeg builds were 3-4x too slow. We needed to determine if architectural changes could close this performance gap.",
    line244: "Phase 1: Baseline FFmpeg port achieved 18fps (4K). Phase 2: Implemented custom SIMD intrinsics using WASM's limited 128-bit operations—improved to 28fps but still insufficient. Phase 3: Developed tile-based parallel decoding approach, splitting frames into 16x16 tiles processed by Web Workers—reached 52fps but caused visible artifacts at tile boundaries. Phase 4: Introduced predictive tile dependency graph to eliminate artifacts while maintaining parallelism. Final optimization: custom memory allocator reduced GC pauses. Validated across 50 test videos, 5 browsers, measured frame timing variance and visual quality (SSIM >0.95).",
    line246: "Demonstrated that WASM can achieve real-time 4K H.265 decoding (62fps average) through tile-parallel architecture combined with specialized memory management. Published findings on optimal tile size (16x16 provides best parallelism/artifact trade-off) and documented WASM-specific optimization patterns. This work proved browser-based 4K video decoding is technically feasible without plugins, advancing web video capabilities.",
    whyItQualifies: [
      "Uncertainty: Unknown if WASM's constraints allowed real-time 4K H.265 decoding",
      "Investigation: 4-phase systematic approach testing architectures, measuring fps and quality",
      "Advancement: Proved feasibility, documented optimal parameters and WASM patterns"
    ]
  },
  {
    id: "software-3",
    category: "software",
    title: "ML Model Compression for Edge",
    description: "Deploying neural networks on resource-constrained IoT devices",
    line242: "Our computer vision model (85MB, 200ms inference) needed to run on IoT devices with 4MB RAM and <100ms latency budget. Standard quantization techniques reduced size but caused >15% accuracy loss—unacceptable for safety-critical applications. The technological challenge: could we achieve <5MB model size and <100ms inference while maintaining >95% of original accuracy on edge hardware? No published research showed this was achievable for our architecture (ResNet-50 variant).",
    line244: "Tested 5 compression strategies: (1) 8-bit quantization alone—11% accuracy drop; (2) pruning 60% weights—13% drop; (3) knowledge distillation to smaller student model—8% drop but still 12MB; (4) combined pruning + quantization—7% drop, 5.2MB; (5) novel hybrid approach using layer-specific mixed precision (FP16 for early layers, INT8 for later). Validated on 10K test images across 3 target devices (ARM Cortex-M7, ESP32-S3, RPi Zero). Measured inference time, memory usage, and per-class accuracy. Discovered early conv layers required higher precision while fully-connected tolerated aggressive quantization.",
    line246: "Proved layer-specific mixed precision enables deployment of complex CNNs on sub-5MB devices while retaining 96.2% accuracy (vs 97.1% original). Documented that first 3 conv layers account for 70% of accuracy-critical computations despite being <20% of parameters. This finding enables practical edge AI deployment in resource-constrained scenarios, advancing understanding of precision requirements by network depth.",
    whyItQualifies: [
      "Uncertainty: Unknown if complex CNN could fit <5MB with <5% accuracy loss",
      "Investigation: Systematically evaluated 5 compression strategies with measured results",
      "Advancement: Demonstrated layer-specific precision approach, quantified precision/accuracy trade-offs"
    ]
  },
  
  // ENGINEERING EXAMPLES
  {
    id: "engineering-1",
    category: "engineering",
    title: "Structural Vibration Damping",
    description: "Active damping system for wind-induced building oscillations",
    line242: "High-rise buildings (>50 floors) experience wind-induced lateral oscillations causing occupant discomfort and structural stress. Passive tuned mass dampers added 200+ tons to roof load. Active damping systems existed but required real-time wind prediction (unknown 5+ seconds ahead) to pre-position counterweights effectively. The core uncertainty: could sensor fusion (accelerometers + anemometers + predictive models) enable active damping with <2-second response time adequate for 40+ story buildings? Prior art showed mixed results; no validated solution existed for Canadian wind conditions.",
    line244: "Installed prototype system on 38-story test building: 4-ton active mass damper on rails, 12 accelerometers (6 per axis), 8 wind sensors, predictive algorithm using LSTM neural network trained on 2 years weather data. Tested 3 control strategies: (1) reactive (accelerometer-only)—reduced sway 35% but 3.2s lag; (2) predictive (weather model + sensors)—predicted 68% of gusts but overcompensated; (3) hybrid using Kalman filter fusion—achieved 1.8s response, 58% sway reduction. Validated during 15 high-wind events (>60 km/h sustained). Compared damper position vs building acceleration, measured occupant comfort (ISO 10137 metrics), structural stress via strain gauges.",
    line246: "Demonstrated that hybrid sensor fusion (Kalman filter combining accelerometer + wind prediction) achieves adequate response time (<2s) for effective active damping in 30-40 story buildings. Proved 58% oscillation reduction is achievable with 4-ton damper (vs 220-ton passive alternative). Documented that LSTM prediction accuracy >65% is sufficient when combined with reactive control. Findings enable lighter, more cost-effective damping solutions for mid-rise construction.",
    whyItQualifies: [
      "Uncertainty: Unknown if sensor fusion could achieve <2s response for effective damping",
      "Investigation: Tested 3 control strategies during real wind events with measured performance",
      "Advancement: Validated hybrid approach parameters, proved 4-ton active beats 220-ton passive"
    ]
  },
  {
    id: "engineering-2",
    category: "engineering",
    title: "Battery Thermal Management",
    description: "Liquid cooling for high-discharge EV battery packs",
    line242: "EV batteries under fast charging (>150kW) generate heat exceeding safe operating temperatures (>45°C), causing degradation and fire risk. Air cooling was insufficient; liquid cooling added weight and complexity. The technical challenge: could phase-change materials (PCM) embedded in battery modules provide adequate cooling without active pumps while maintaining temperature uniformity (±2°C across pack)? No commercial PCM solution existed for automotive vibration/thermal cycling requirements. We needed to determine if custom PCM formulation could meet automotive durability standards.",
    line244: "Developed 6 PCM candidates (paraffin-based, salt hydrate-based, eutectic mixtures). Tested thermal properties: melting point 38-42°C, latent heat >180 kJ/kg, thermal conductivity >2 W/mK. Built test pack (48 cells, 14 kWh) with embedded PCM pouches. Subjected to: (1) fast charge cycles (0-80% in 18 min) measuring cell temps every second; (2) vibration testing per ISO 12405-2; (3) 1000 thermal cycles (-20°C to 50°C) checking PCM degradation. Paraffin blend (60% C18/40% C20) with graphite nanoplatelets achieved best performance. Validated temperature uniformity ±1.8°C across pack during 150kW charging, PCM absorbed 85% of heat without active cooling.",
    line246: "Proved paraffin/graphite nanoplatelet PCM (60/40 C18/C20 ratio) maintains EV battery pack temperatures within ±2°C during 150kW fast charging without pumps or radiators. Demonstrated 1000+ cycle durability meeting automotive standards (ISO 12405). Documented 8% weight reduction vs liquid cooling, enabling greater vehicle range. This work establishes PCM viability for automotive applications, advancing passive thermal management technology.",
    whyItQualifies: [
      "Uncertainty: Unknown if PCM could meet automotive thermal uniformity and durability needs",
      "Investigation: Tested 6 formulations through charging, vibration, and thermal cycling",
      "Advancement: Validated specific PCM blend, proved automotive-grade passive cooling feasibility"
    ]
  },
  {
    id: "engineering-3",
    category: "engineering",
    title: "Acoustic Metamaterial Barriers",
    description: "Noise reduction using engineered periodic structures",
    line242: "Highway noise barriers (2-4m height) reduce sound by 10-15 dB but require massive concrete construction. Acoustic metamaterials promised superior attenuation through sub-wavelength resonance, but no practical outdoor design existed due to weather durability and broadband performance issues. The uncertainty: could we design a metamaterial panel achieving >20 dB reduction (500-2000 Hz) while withstanding Canadian climate (freeze/thaw, UV, wind loads)? Laboratory prototypes showed promise but hadn't been validated for civil infrastructure.",
    line244: "Designed 8 metamaterial unit cell geometries using FEA simulation (COMSOL): Helmholtz resonators, membrane absorbers, periodic gratings. Down-selected 3 candidates based on predicted transmission loss. Fabricated full-scale panels (2m x 0.5m) using UV-resistant polycarbonate and aluminum. Installed test array (24 panels) adjacent to Highway 401. Measured sound reduction using calibrated microphones (A-weighted SPL) over 18 months. Tested mechanical durability: freeze/thaw cycles (200 cycles), wind loading (simulated 120 km/h gusts), UV exposure (QUV-A, 2000 hours). Optimized design achieved 22.5 dB reduction at peak traffic frequencies (800-1200 Hz), maintained performance after 18-month exposure.",
    line246: "Demonstrated that polycarbonate/aluminum Helmholtz resonator metamaterial panels achieve >20 dB highway noise reduction while surviving Canadian climate conditions (200 freeze/thaw cycles, 2000h UV). Proved metamaterial approach provides 65% better attenuation than traditional barriers at 1/3 the weight. Documented resonator geometry and spacing parameters for 500-2000 Hz broadband performance. Work establishes metamaterials as viable alternative for civil noise control applications.",
    whyItQualifies: [
      "Uncertainty: Unknown if metamaterial barriers could achieve >20 dB and survive outdoors",
      "Investigation: FEA design, fabrication, 18-month field testing measuring acoustics and durability",
      "Advancement: Validated outdoor metamaterial viability, documented design parameters"
    ]
  },
  
  // MANUFACTURING EXAMPLES
  {
    id: "manufacturing-1",
    category: "manufacturing",
    title: "Injection Mold Thermal Control",
    description: "Sub-0.5°C temperature uniformity for precision plastics",
    line242: "Medical device components required ±0.3°C temperature uniformity across injection mold to prevent warping and ensure dimensional tolerance (<0.05mm). Conventional PID controllers achieved only ±1.2°C uniformity due to thermal lag and uneven heating from complex mold geometries. The technological challenge: could predictive control with conformal cooling channels achieve <±0.5°C uniformity? No commercial solution existed for our mold design (8 cavities, aluminum alloy).",
    line244: "Iteration 1: Standard PID + cartridge heaters = ±1.2°C, 18% scrap rate. Iteration 2: Added conformal cooling (3D-printed channels following cavity contours) + advanced PID = ±0.9°C, 12% scrap. Iteration 3: Implemented model predictive control (MPC) using thermal FEA model + 16 RTD sensors = ±0.7°C, 8% scrap. Iteration 4: MPC + machine learning adaptation (trained on 500 cycles) = ±0.4°C, 2.1% scrap rate. Measured temperature at 16 mold locations every 0.5s over 1000 production cycles. Validated dimensional accuracy via CMM measurement (50 parts per iteration).",
    line246: "Proved ML-enhanced MPC with conformal cooling achieves ±0.4°C mold uniformity for complex geometries, enabling medical-grade dimensional tolerances. Demonstrated 85% scrap reduction vs conventional control (18% → 2.1%). Documented that adaptive learning from production data outperforms static FEA models by 45%. Work establishes feasibility of ML process control for precision injection molding.",
    whyItQualifies: [
      "Uncertainty: Unknown if <±0.5°C uniformity achievable in complex mold geometry",
      "Investigation: 4 iterations testing control strategies with measured temp and quality",
      "Advancement: Validated ML-MPC approach, proved 85% scrap reduction"
    ]
  },
  {
    id: "manufacturing-2",
    category: "manufacturing",
    title: "Additive Manufacturing Post-Processing",
    description: "Automated support removal for metal 3D printed parts",
    line242: "Metal 3D printed aerospace parts (Ti-6Al-4V) required support structures that were difficult to remove without damaging thin-walled features (0.5mm walls). Manual removal took 6+ hours per part with 15% damage rate. Existing automated methods (EDM, chemical) either too slow or damaged parent material. The challenge: could robotic force-controlled machining remove supports without exceeding safe force thresholds (avoiding 0.5mm wall buckling at <50N)? No proven solution existed for complex geometries with varying wall thicknesses.",
    line244: "Developed robotic cell with 6-axis arm, force-torque sensor, and custom cutting tools. Tested 4 approaches: (1) Constant feed rate—14% wall damage; (2) Constant force (30N target)—8% damage but 9h per part; (3) Adaptive feed using real-time force feedback—5% damage, 4.2h cycle time; (4) Vision-guided trajectory planning + adaptive force—1.8% damage, 3.1h time. Approach 4 used structured light scanning to identify thin walls, adjusted feed rates and tool paths accordingly. Validated on 60 test parts with varying geometries. Measured force profiles, surface roughness (Ra), dimensional accuracy, and visual defect inspection.",
    line246: "Demonstrated vision-guided adaptive force control achieves <2% damage rate for 0.5mm wall metal AM parts while reducing cycle time to 3.1h (vs 6h manual). Proved real-time force feedback with <20N variance maintains part integrity. Documented that structured light pre-scan enables 65% faster processing than blind force control. Findings enable production-scale automated post-processing of delicate AM aerospace components.",
    whyItQualifies: [
      "Uncertainty: Unknown if robotic force control could safely process 0.5mm walls",
      "Investigation: Tested 4 strategies on 60 parts with measured force, damage, and cycle time",
      "Advancement: Validated vision+force approach, proved production-scale viability"
    ]
  },
  
  // OTHER CATEGORIES
  {
    id: "biotech-1",
    category: "biotech",
    title: "Protein Crystallization Automation",
    description: "AI-optimized conditions for X-ray crystallography",
    line242: "X-ray crystallography requires protein crystals, but crystallization conditions (pH, precipitant, temperature) are empirically determined through thousands of trials. Traditional screening tested 96-384 conditions per protein, taking weeks with 5-15% success rate. The uncertainty: could machine learning predict optimal crystallization conditions from protein sequence alone, reducing trials by >80%? No existing ML model had been validated on diverse protein families, and it was unknown if sequence data contained sufficient information for prediction.",
    line244: "Collected crystallization data for 2,847 proteins (PDB database). Trained 3 ML architectures: (1) Random forest using sequence features (hydrophobicity, charge, secondary structure prediction)—42% success rate, 85 avg trials; (2) CNN on sequence embeddings—58% success, 48 trials; (3) Transformer model with attention on functional domains—71% success, 28 trials. Validated on 120 novel proteins (not in training set). Compared predicted vs actual optimal conditions. Measured crystallization success rate, number of trials to first crystal, and crystal quality (resolution, mosaicity). Discovered domain architecture and surface charge distribution were strongest predictors.",
    line246: "Proved transformer ML model achieves 71% crystallization success with 28 trials average (vs 15% / 300 trials baseline), reducing time from weeks to days. Demonstrated protein sequence contains sufficient information for condition prediction, advancing understanding of crystallization biophysics. Documented that surface charge patterns (not just composition) predict precipitant compatibility. Work enables high-throughput structural biology.",
    whyItQualifies: [
      "Uncertainty: Unknown if sequence data alone could predict crystallization conditions",
      "Investigation: Trained/validated 3 ML architectures on 2,847 proteins, tested on 120 novel targets",
      "Advancement: Proved 71% success with 28 trials, identified surface charge as key predictor"
    ]
  },
  {
    id: "cleantech-1",
    category: "cleantech",
    title: "Grid-Scale Energy Storage Optimization",
    description: "AI dispatch controller for hybrid battery/hydrogen systems",
    line242: "Grid-scale storage (50 MWh) combining batteries (fast response) and hydrogen (seasonal storage) required intelligent dispatch to minimize degradation while meeting grid demands. Batteries degrade with deep discharge cycles; electrolyzers prefer steady operation. The challenge: could reinforcement learning optimize real-time dispatch decisions balancing degradation costs, electricity prices, and grid obligations? No validated RL controller existed for hybrid systems at this scale; it was unclear if the control problem was tractable given 100+ state variables.",
    line244: "Developed RL agent (proximal policy optimization) with state space: grid demand, electricity price, battery SOC/SOH, electrolyzer efficiency, hydrogen storage level. Reward function: revenue minus degradation costs. Trained in simulation (3 years of historical grid data). Deployed on pilot system (2 MWh battery, 500 kW electrolyzer). Tested 3 strategies: (1) Rule-based heuristics—$127K annual degradation; (2) Model predictive control—$89K degradation but 8% missed grid obligations; (3) RL agent—$71K degradation, 0.4% missed obligations. Ran for 18 months, measured battery capacity fade (SOH), electrolyzer degradation (stack resistance), and revenue performance.",
    line246: "Demonstrated RL dispatch achieves 44% lower degradation costs ($71K vs $127K) than heuristic control while meeting grid obligations. Proved RL can handle 100+ state variable control problem in real-time (<1s decision latency). Documented that learned strategy prioritizes off-peak electrolyzer operation, extending equipment life 30%. Work advances understanding of AI control for complex hybrid storage systems.",
    whyItQualifies: [
      "Uncertainty: Unknown if RL could optimize complex 100+ variable hybrid storage dispatch",
      "Investigation: Developed RL agent, tested 3 strategies over 18 months with measured degradation/performance",
      "Advancement: Proved RL viability with 44% cost reduction, documented learned optimal strategies"
    ]
  }
];

export const ExampleGallery = () => {
  const handleCopySection = (content: string, section: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${section} copied to clipboard!`);
  };

  const categoryLabels: Record<string, string> = {
    software: "Software",
    engineering: "Engineering",
    manufacturing: "Manufacturing",
    biotech: "Biotech",
    cleantech: "Clean Tech"
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      software: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      engineering: "bg-green-500/10 text-green-700 dark:text-green-300",
      manufacturing: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
      biotech: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
      cleantech: "bg-teal-500/10 text-teal-700 dark:text-teal-300"
    };
    return colors[category] || "bg-gray-500/10 text-gray-700";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">SR&ED Examples by Industry</h3>
        <p className="text-sm text-muted-foreground">
          Real-world examples showing how to structure Line 242 (Uncertainty), Line 244 (Investigation), and Line 246 (Advancement) across different industries.
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
          <TabsTrigger value="engineering">Engineering</TabsTrigger>
          <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
          <TabsTrigger value="biotech">Biotech</TabsTrigger>
          <TabsTrigger value="cleantech">Clean Tech</TabsTrigger>
        </TabsList>

        {["all", "software", "engineering", "manufacturing", "biotech", "cleantech"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {examples
                  .filter((ex) => tab === "all" || ex.category === tab)
                  .map((example) => (
                    <ExampleCard
                      key={example.id}
                      example={example}
                      onCopy={handleCopySection}
                      categoryColor={getCategoryColor(example.category)}
                      categoryLabel={categoryLabels[example.category] || example.category}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const ExampleCard = ({
  example,
  onCopy,
  categoryColor,
  categoryLabel
}: {
  example: ExampleItem;
  onCopy: (content: string, section: string) => void;
  categoryColor: string;
  categoryLabel: string;
}) => {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{example.title}</h4>
            <Badge className={categoryColor}>{categoryLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{example.description}</p>
        </div>
      </div>

      {/* Line 242: Uncertainty */}
      <div className="space-y-2 border-l-2 border-blue-500/50 pl-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            LINE 242: Scientific/Technological Uncertainty
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(example.line242, "Line 242")}
            className="h-6 px-2"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{example.line242}</p>
      </div>

      {/* Line 244: Investigation */}
      <div className="space-y-2 border-l-2 border-green-500/50 pl-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400">
            LINE 244: Systematic Investigation
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(example.line244, "Line 244")}
            className="h-6 px-2"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{example.line244}</p>
      </div>

      {/* Line 246: Advancement */}
      <div className="space-y-2 border-l-2 border-purple-500/50 pl-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            LINE 246: Scientific/Technological Advancement
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(example.line246, "Line 246")}
            className="h-6 px-2"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{example.line246}</p>
      </div>

      {/* Why It Qualifies */}
      <div className="space-y-1.5 pt-2 border-t">
        <p className="text-xs font-semibold">Why This Qualifies:</p>
        <ul className="text-xs space-y-1">
          {example.whyItQualifies.map((reason, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-primary">•</span>
              <span className="text-muted-foreground">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
