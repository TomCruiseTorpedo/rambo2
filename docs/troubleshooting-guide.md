# Troubleshooting Guide

## Overview

This guide provides step-by-step troubleshooting procedures for common issues in the Rambo2 SR&ED GPT application. Use this guide to diagnose and resolve problems quickly and effectively.

## Quick Diagnostic Tools

### System Health Check

```bash
node scripts/diagnostics/system-health-check.js
```

Performs comprehensive health checks across all system components.

### Bug Reproduction Tool

```bash
node scripts/diagnostics/bug-reproduction-tool.js list
node scripts/diagnostics/bug-reproduction-tool.js run frontend ui-rendering
```

Helps reproduce and verify bug fixes with structured test scenarios.

### Monitoring System

```bash
node scripts/diagnostics/monitoring-alerts.js start
node scripts/diagnostics/monitoring-alerts.js report
```

Monitors system components and generates alerts for production issues.

## Common Issues and Solutions

### Frontend Issues

#### 1. Application Won't Start

**Symptoms:**

- `npm run dev` fails
- Build errors during startup
- White screen or loading indefinitely

**Diagnosis Steps:**

1. Check Node.js version: `node --version` (should be 18+)
2. Verify dependencies: `npm install`
3. Check for TypeScript errors: `npm run build`
4. Review console errors in browser developer tools

**Solutions:**

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# Check for port conflicts
lsof -i :5173
```

#### 2. File Upload Not Working

**Symptoms:**

- Files not uploading
- Upload progress stuck
- Error messages during upload

**Diagnosis Steps:**

1. Check file size limits (default: 10MB)
2. Verify file types are supported
3. Check network connectivity
4. Review browser console for errors

**Solutions:**

```bash
# Test file upload component
npm run test:run src/components/__tests__/ui-rendering-consistency.property.test.tsx

# Check file validation logic
grep -r "file.*validation" src/components/upload/
```

#### 3. UI Components Not Rendering Correctly

**Symptoms:**

- Broken layouts
- Missing styles
- Components not responsive

**Diagnosis Steps:**

1. Check CSS imports and Tailwind configuration
2. Verify component props and state
3. Test across different browsers and screen sizes
4. Check for JavaScript errors

**Solutions:**

```bash
# Rebuild CSS
npm run build:css

# Test component rendering
npm run test:run src/components/__tests__/

# Check Tailwind configuration
npx tailwindcss --help
```

### Backend Issues

#### 1. Edge Functions Failing

**Symptoms:**

- 500 errors from Supabase functions
- Timeout errors
- Memory limit exceeded

**Diagnosis Steps:**

1. Check Supabase function logs
2. Verify function deployment status
3. Test with smaller payloads
4. Check memory usage patterns

**Solutions:**

```bash
# Deploy functions
supabase functions deploy process-sred
supabase functions deploy process-document-ocr
supabase functions deploy fill-pdf-t661

# Check function logs
supabase functions logs process-sred

# Test function locally
supabase functions serve
```

#### 2. PDF Generation Issues

**Symptoms:**

- PDFs not generating
- Incorrect field mappings
- Missing or misaligned text

**Diagnosis Steps:**

1. Verify field mapping files exist and are valid
2. Check PDF template integrity
3. Test with different narrative lengths
4. Validate coordinate mappings

**Solutions:**

```bash
# Validate field mappings
node -e "console.log(JSON.parse(require('fs').readFileSync('supabase/field_mappings/t661_mapping.json')))"

# Test PDF generation
node scripts/test_t661_fill.js

# Upload new mappings if needed
node scripts/upload_mapping.js
```

#### 3. AI Processing Failures

**Symptoms:**

- AI responses not generating
- Fallback system not working
- Model errors or timeouts

**Diagnosis Steps:**

1. Check API key configuration
2. Verify model availability
3. Test each tier individually
4. Check rate limits and quotas

**Solutions:**

```bash
# Test OpenRouter (narrative model — replace model id as needed)
curl -sS https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/llama-3.1-8b-instruct","messages":[{"role":"user","content":"ping"}]}'

# Optional Groq fallback
echo "$GROQ_API_KEY" | wc -c

# Supabase secrets (set in dashboard, not always in shell)
# OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_VISION_MODEL, GROQ_API_KEY
```

### Database Issues

#### 1. Connection Errors

**Symptoms:**

- Database connection timeouts
- Authentication failures
- Query errors

**Diagnosis Steps:**

1. Verify Supabase URL and keys
2. Check network connectivity
3. Test database queries
4. Review connection pool settings

**Solutions:**

```bash
# Test database connection
supabase db ping

# Reset database connection
supabase db reset

# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### 2. Field Mapping Issues

**Symptoms:**

- Incorrect field mappings
- Missing field data
- Mapping upload failures

**Diagnosis Steps:**

1. Validate mapping JSON structure
2. Check field coordinate accuracy
3. Verify mapping upload process
4. Test with known good mappings

**Solutions:**

```bash
# Validate mapping structure
node scripts/validate_field_mappings.js

# Re-upload mappings
node scripts/upload_mapping.js

# Test field boundaries
node scripts/test_field_boundaries.js
```

### Performance Issues

#### 1. Slow Response Times

**Symptoms:**

- Long loading times
- Timeouts during processing
- Poor user experience

**Diagnosis Steps:**

1. Monitor response times
2. Check resource usage (CPU, memory)
3. Analyze network requests
4. Profile application performance

**Solutions:**

```bash
# Start monitoring
node scripts/diagnostics/monitoring-alerts.js start

# Run performance tests
npm run test:run tests/backend/backend-processing-reliability.property.test.ts

# Optimize bundle size
npm run build --analyze
```

#### 2. Memory Issues

**Symptoms:**

- Out of memory errors
- Memory leaks
- Slow garbage collection

**Diagnosis Steps:**

1. Monitor memory usage patterns
2. Check for memory leaks
3. Analyze heap snapshots
4. Review large object allocations

**Solutions:**

```bash
# Monitor memory usage
node --inspect scripts/diagnostics/monitoring-alerts.js start

# Run with memory profiling
node --max-old-space-size=4096 scripts/process_large_file.js

# Check for memory leaks
npm run test:run tests/backend/enhanced-database-operations.test.ts
```

## Error Code Reference

### Frontend Error Codes

- `FE001`: Component rendering failure
- `FE002`: File upload validation error
- `FE003`: Network request timeout
- `FE004`: Authentication failure
- `FE005`: State management error

### Backend Error Codes

- `BE001`: Edge function timeout
- `BE002`: Memory limit exceeded
- `BE003`: Invalid request payload
- `BE004`: Database connection error
- `BE005`: AI processing failure

### Integration Error Codes

- `INT001`: PDF generation failure
- `INT002`: Field mapping error
- `INT003`: OCR processing failure
- `INT004`: File format not supported
- `INT005`: External API failure

## Recovery Procedures

### 1. System Recovery

```bash
# Full system reset
npm run clean
npm install
npm run build
supabase db reset
supabase functions deploy --all
```

### 2. Database Recovery

```bash
# Reset database to clean state
supabase db reset

# Re-upload field mappings
node scripts/upload_mapping.js

# Verify database integrity
supabase db lint
```

### 3. Function Recovery

```bash
# Redeploy all functions
supabase functions deploy process-sred
supabase functions deploy process-document-ocr
supabase functions deploy fill-pdf-t661

# Test function endpoints
curl -X POST "$SUPABASE_URL/functions/v1/process-sred" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 4. Cache Recovery

```bash
# Clear all caches
rm -rf node_modules/.cache
rm -rf .next/cache
rm -rf dist/
npm run build
```

## Monitoring and Alerting

### Setting Up Monitoring

```bash
# Start continuous monitoring
node scripts/diagnostics/monitoring-alerts.js start

# Configure alerts (set environment variables)
export ALERT_EMAIL="admin@example.com"
export SLACK_WEBHOOK="https://hooks.slack.com/..."
export ALERT_WEBHOOK="https://your-webhook-url.com"
```

### Alert Types

- **Health Alerts**: System component failures
- **Performance Alerts**: High resource usage
- **Error Alerts**: High error rates or critical errors
- **Disk Alerts**: Low disk space warnings

### Log Files

- `monitoring-health.log`: Health check results
- `monitoring-performance.log`: Performance metrics
- `monitoring-errors.log`: Error scan results
- `monitoring-alerts.log`: Alert history

## Prevention Best Practices

### 1. Regular Health Checks

- Run system health checks daily
- Monitor performance metrics
- Review error logs regularly
- Update dependencies monthly

### 2. Testing Strategy

- Run full test suite before deployments
- Use property-based testing for critical components
- Test error scenarios and edge cases
- Validate performance under load

### 3. Deployment Practices

- Use staging environment for testing
- Deploy during low-traffic periods
- Have rollback procedures ready
- Monitor system after deployments

### 4. Documentation Maintenance

- Keep troubleshooting guide updated
- Document new issues and solutions
- Maintain runbooks for common procedures
- Share knowledge across team members

## Getting Help

### Internal Resources

1. Check this troubleshooting guide
2. Review system documentation in `.kiro/docs/`
3. Run diagnostic tools for automated analysis
4. Check recent changes in git history

### External Resources

1. Supabase Documentation: <https://supabase.com/docs>
2. Vite Documentation: <https://vitejs.dev/guide/>
3. React Documentation: <https://react.dev/>
4. Tailwind CSS Documentation: <https://tailwindcss.com/docs>

### Escalation Process

1. Try automated diagnostic tools
2. Follow relevant troubleshooting procedures
3. Check for known issues in documentation
4. Gather system information and logs
5. Contact system administrator with detailed information

## Emergency Contacts

- **System Administrator**: [Contact Information]
- **Development Team**: [Contact Information]
- **Infrastructure Team**: [Contact Information]
- **On-Call Support**: [Contact Information]

---

*Last Updated: [Current Date]*
*Version: 1.0*
