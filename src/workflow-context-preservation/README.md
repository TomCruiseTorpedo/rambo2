# Workflow Context Preservation System

This module implements automatic workflow state preservation when chat sessions approach context limits, ensuring seamless continuation of work across multiple chat windows.

## Components

- **ContextMonitor**: Tracks context utilization and triggers preservation
- **WorkflowManager**: Manages active workflow state and coordinates preservation  
- **PreservationEngine**: Compacts and saves workflow state when limits approached
- **RestorationEngine**: Loads and reconstructs workflow state in new sessions
- **SessionController**: Manages session transitions and workflow continuity

## Key Features

- Automatic detection of context limits (95% threshold)
- Intelligent context compaction (targets 80% reduction while prioritizing critical information)
- Seamless workflow continuation across sessions
- Property-based testing for correctness verification

## Testing

The module includes comprehensive property-based tests using fast-check:

```bash
# Run all workflow context preservation tests
npm run test:run src/workflow-context-preservation/

# Run specific property tests
npm run test:run src/workflow-context-preservation/__tests__/workflow-state.property.test.ts
```

## Usage

```typescript
import { 
  ContextMonitor, 
  WorkflowManager, 
  PreservationEngine,
  RestorationEngine,
  SessionController 
} from './workflow-context-preservation';

// Initialize components
const monitor = new ContextMonitor();
const workflowManager = new WorkflowManager();
const preservationEngine = new PreservationEngine();
const restorationEngine = new RestorationEngine();
const sessionController = new SessionController();

// Set up monitoring
monitor.registerThresholdCallback(95, () => {
  // Trigger preservation when 95% capacity reached
});
```