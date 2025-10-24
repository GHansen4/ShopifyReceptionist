# Shopify App Testing Guide - Official Compliance

## 🎯 SHOPIFY-COMPLIANT TESTING APPROACH

This guide follows Shopify's official documentation for testing embedded apps (October 2025).

## 📋 Prerequisites

### Required Tools
- Shopify CLI (`@shopify/cli`)
- Development store access
- Shopify Partner account

### Environment Setup
```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Login to Shopify
shopify auth login

# Verify installation
shopify version
```

## 🚀 Official Testing Workflow

### Step 1: Start Shopify Development Server

```bash
# Navigate to your app directory
cd shopify-voice-receptionist

# Start Shopify development server
shopify app dev
```

**Expected Output:**
```
✓ App is now running at: https://xxxx-xxxx-xxxx.trycloudflare.com
✓ App is now available at: https://xxxx-xxxx-xxxx.trycloudflare.com
✓ Opening app in development store...
```

### Step 2: Test in Shopify Admin

1. **App Installation**
   - Shopify CLI will automatically open your app
   - Complete OAuth flow in embedded iframe
   - Verify session creation

2. **Core Functionality Testing**
   - Test voice AI receptionist
   - Verify product queries
   - Check order management
   - Test error handling

### Step 3: Development Store Testing

1. **Create Test Orders**
   ```bash
   # Use Shopify's Bogus Gateway
   # Enable test mode for payment providers
   # Simulate real transaction flows
   ```

2. **Test App Lifecycle**
   - Install app
   - Test all features
   - Uninstall app
   - Verify cleanup

### Step 4: Performance Testing

1. **Lighthouse Testing**
   ```bash
   # Install Lighthouse
   npm install -g lighthouse
   
   # Test performance
   lighthouse https://your-app-url.com --view
   ```

2. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast verification

## 📝 App Review Preparation

### Testing Instructions for Reviewers

```markdown
# App Testing Instructions

## Setup
1. Install app on development store
2. Configure Vapi AI integration
3. Test voice functionality

## Test Cases
1. OAuth authentication
2. Voice AI receptionist
3. Product queries
4. Order management
5. Error handling

## Credentials
- Development store: [store-name].myshopify.com
- Test phone number: +1-XXX-XXX-XXXX
- Admin access: [credentials]
```

### Screencast Requirements
- Record app installation process
- Demonstrate core functionalities
- Show error handling scenarios
- Include voice AI testing

## 🔍 Quality Assurance Checklist

### ✅ OAuth Flow
- [ ] App redirects to Shopify OAuth
- [ ] OAuth completes successfully
- [ ] Session is created and stored
- [ ] Embedded iframe works correctly

### ✅ Voice AI Integration
- [ ] Assistant is created successfully
- [ ] Phone number is provisioned
- [ ] Voice calls work correctly
- [ ] Product queries function

### ✅ API Endpoints
- [ ] Authentication works on protected routes
- [ ] Products API returns data
- [ ] Error handling is proper
- [ ] Rate limiting works

### ✅ Database Integration
- [ ] Shop data is stored correctly
- [ ] Session management works
- [ ] Data cleanup on uninstall

## 🚨 Common Issues & Solutions

### Issue: App not loading in Shopify Admin
**Solution:**
- Check if tunnel URL is accessible
- Verify environment variables
- Check browser console for errors

### Issue: OAuth flow fails
**Solution:**
- Verify app URL in Partner Dashboard
- Check redirect URLs
- Ensure HTTPS is enabled

### Issue: Voice AI not working
**Solution:**
- Check Vapi API key
- Verify phone number provisioning
- Test function endpoints

## 📊 Success Criteria

### ✅ Shopify Compliance
- [ ] Uses `shopify app dev` for testing
- [ ] Tests on development stores
- [ ] Follows embedded app patterns
- [ ] Meets performance standards

### ✅ App Functionality
- [ ] OAuth flow works
- [ ] Voice AI responds correctly
- [ ] Product queries work
- [ ] Error handling is proper

### ✅ Production Readiness
- [ ] No console errors
- [ ] Proper error messages
- [ ] Performance is acceptable
- [ ] Accessibility standards met

## 🎯 Next Steps

1. **Complete Shopify CLI Testing**
2. **Create App Review Documentation**
3. **Record Testing Screencast**
4. **Submit for Shopify App Review**

---

**Note:** This guide follows Shopify's official documentation for testing embedded apps (October 2025). Always refer to the latest Shopify documentation for updates.
