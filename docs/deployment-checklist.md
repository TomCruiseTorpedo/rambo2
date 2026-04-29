# Deployment Checklist

## Overview

This checklist ensures safe and reliable deployments to production. Follow all steps in order and verify each checkpoint before proceeding.

## Pre-Deployment Phase

### 1. Code Quality Verification

- [ ] All tests pass locally (`npm run test:run`)
- [ ] Code coverage meets minimum threshold (70%)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No console.log statements in production code
- [ ] All TODO comments addressed or documented

### 2. Security Review

- [ ] No hardcoded secrets or API keys in code
- [ ] Environment variables properly configured
- [ ] Dependencies security audit passed (`npm audit`)
- [ ] HTTPS configuration verified
- [ ] Authentication and authorization working correctly

### 3. Performance Validation

- [ ] Bundle size within acceptable limits (<5MB total)
- [ ] JavaScript bundle optimized (<2MB)
- [ ] Images optimized and compressed
- [ ] No memory leaks detected
- [ ] Response times within thresholds (<5s)

### 4. Functional Testing

- [ ] All user flows tested end-to-end
- [ ] File upload functionality verified
- [ ] PDF generation working correctly
- [ ] AI processing and fallback system tested
- [ ] Error handling scenarios validated
- [ ] Mobile responsiveness confirmed

### 5. Infrastructure Readiness

- [ ] Supabase functions deployed and tested
- [ ] Database migrations applied (if any)
- [ ] Field mappings uploaded and verified
- [ ] Environment variables configured in deployment platform
- [ ] DNS and domain configuration verified

## Automated Pre-Deployment Validation

Run the automated validation script:

```bash
node scripts/deployment/pre-deployment-validation.js
```

**Requirements:**

- [ ] All critical validations pass (0 failures)
- [ ] Warnings reviewed and acceptable
- [ ] Success rate >95%
- [ ] Build completes within 3 minutes
- [ ] Tests complete within 5 minutes

## Backup and Rollback Preparation

### 1. Create Deployment Backup

```bash
node scripts/deployment/rollback-procedures.js backup production
```

- [ ] Backup created successfully
- [ ] Backup ID recorded: `_________________`
- [ ] Previous deployment information saved
- [ ] Database state captured
- [ ] Function versions documented

### 2. Rollback Plan Ready

- [ ] Rollback procedures tested in staging
- [ ] Rollback script validated
- [ ] Team notified of deployment window
- [ ] Monitoring alerts configured
- [ ] Emergency contacts available

## Deployment Execution

### 1. Frontend Deployment (Vercel)

```bash
# Deploy to production
vercel --prod

# Or promote staging deployment
vercel promote <deployment-url> --yes
```

**Verification Steps:**

- [ ] Deployment completed without errors
- [ ] New deployment URL accessible
- [ ] Health check endpoint responding
- [ ] Static assets loading correctly
- [ ] No JavaScript errors in console

### 2. Backend Deployment (Supabase)

```bash
# Deploy all functions
supabase functions deploy process-sred
supabase functions deploy process-document-ocr
supabase functions deploy fill-pdf-t661
```

**Verification Steps:**

- [ ] All functions deployed successfully
- [ ] Function endpoints responding
- [ ] Database connectivity verified
- [ ] Field mappings accessible
- [ ] API authentication working

### 3. Database Updates (if applicable)

```bash
# Apply migrations
supabase db push

# Upload field mappings
node scripts/upload_mapping.js
```

**Verification Steps:**

- [ ] Migrations applied successfully
- [ ] Data integrity maintained
- [ ] Field mappings updated
- [ ] No data loss occurred
- [ ] Queries performing as expected

## Post-Deployment Validation

### 1. Immediate Health Checks

```bash
node scripts/diagnostics/system-health-check.js
```

**Critical Checks:**

- [ ] Frontend application loading
- [ ] All API endpoints responding
- [ ] Database queries executing
- [ ] File upload functionality working
- [ ] PDF generation operational

### 2. End-to-End Testing

Run critical user flows:

- [ ] **Document Upload Flow**
  - Upload various file types (images, PDFs, Excel)
  - Verify file validation and error handling
  - Confirm processing status updates

- [ ] **AI Processing Flow**
  - Test narrative generation
  - Verify fallback system activation
  - Check processing timeouts and retries

- [ ] **PDF Generation Flow**
  - Generate PDFs with different content lengths
  - Verify field mapping accuracy
  - Test download functionality

### 3. Performance Monitoring

```bash
node scripts/diagnostics/monitoring-alerts.js start
```

**Monitor for 30 minutes:**

- [ ] Response times <5 seconds
- [ ] Error rate <5%
- [ ] Memory usage stable
- [ ] CPU usage normal
- [ ] No critical alerts triggered

### 4. User Acceptance Testing

- [ ] Key stakeholders notified of deployment
- [ ] Sample user workflows tested
- [ ] Feedback collected and documented
- [ ] No critical issues reported
- [ ] User experience acceptable

## Rollback Criteria

**Immediate Rollback Required If:**

- [ ] Critical functionality broken
- [ ] Security vulnerability exposed
- [ ] Data corruption detected
- [ ] Error rate >10%
- [ ] Response times >10 seconds
- [ ] System completely inaccessible

**Rollback Procedure:**

```bash
node scripts/deployment/rollback-procedures.js rollback <backup-id> production
```

## Post-Deployment Tasks

### 1. Documentation Updates

- [ ] Deployment notes documented
- [ ] Version numbers updated
- [ ] Changelog entries added
- [ ] Known issues documented
- [ ] Troubleshooting guide updated

### 2. Team Communication

- [ ] Deployment success announced
- [ ] New features communicated
- [ ] Support team briefed
- [ ] Monitoring team notified
- [ ] Stakeholders updated

### 3. Monitoring Setup

- [ ] Production monitoring active
- [ ] Alert thresholds configured
- [ ] Log aggregation working
- [ ] Performance baselines established
- [ ] Error tracking operational

### 4. Cleanup Tasks

- [ ] Old deployment artifacts cleaned up
- [ ] Temporary files removed
- [ ] Development branches merged/deleted
- [ ] Staging environment updated
- [ ] Backup retention policy applied

## Emergency Procedures

### If Deployment Fails During Execution

1. **Stop deployment immediately**
2. **Assess impact and scope**
3. **Execute rollback if necessary**
4. **Investigate root cause**
5. **Document incident**
6. **Plan remediation**

### If Issues Discovered Post-Deployment

1. **Assess severity and user impact**
2. **Implement hotfix if possible**
3. **Execute rollback if hotfix not viable**
4. **Communicate with stakeholders**
5. **Schedule proper fix deployment**

### Emergency Contacts

- **System Administrator:** [Contact Info]
- **Development Lead:** [Contact Info]
- **Infrastructure Team:** [Contact Info]
- **On-Call Support:** [Contact Info]

## Deployment Sign-Off

### Pre-Deployment Approval

- [ ] **Development Lead:** _________________ Date: _______
- [ ] **QA Lead:** _________________ Date: _______
- [ ] **Security Review:** _________________ Date: _______
- [ ] **Infrastructure Team:** _________________ Date: _______

### Post-Deployment Verification

- [ ] **System Administrator:** _________________ Date: _______
- [ ] **Product Owner:** _________________ Date: _______
- [ ] **Support Team Lead:** _________________ Date: _______

### Deployment Summary

- **Deployment Date:** _________________
- **Deployment Time:** _________________
- **Deployed Version:** _________________
- **Backup ID:** _________________
- **Issues Encountered:** _________________
- **Resolution Actions:** _________________

---

## Deployment Automation Scripts

### Quick Commands Reference

```bash
# Full pre-deployment validation
npm run deploy:validate

# Create backup
npm run deploy:backup

# Deploy to production
npm run deploy:prod

# Post-deployment health check
npm run deploy:verify

# Emergency rollback
npm run deploy:rollback <backup-id>
```

### Package.json Scripts

Add these scripts to your package.json for easier deployment:

```json
{
  "scripts": {
    "deploy:validate": "node scripts/deployment/pre-deployment-validation.js",
    "deploy:backup": "node scripts/deployment/rollback-procedures.js backup production",
    "deploy:prod": "vercel --prod && supabase functions deploy --all",
    "deploy:verify": "node scripts/diagnostics/system-health-check.js",
    "deploy:rollback": "node scripts/deployment/rollback-procedures.js rollback"
  }
}
```

---

*Last Updated: [Current Date]*
*Version: 1.0*
*Next Review: [Date + 3 months]*
