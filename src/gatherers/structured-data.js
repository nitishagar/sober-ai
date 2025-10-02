const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class StructuredDataGatherer {
  constructor() {
    // Load schema templates
    const configPath = path.join(__dirname, '../config/schema-templates.yaml');
    this.schemaTemplates = yaml.load(fs.readFileSync(configPath, 'utf8'));
  }

  async gather(url, page) {
    logger.info(`Structured Data: Analyzing ${url}`);

    const structuredData = await page.evaluate(() => {
      // Extract JSON-LD
      const jsonLdScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );

      const jsonLdData = jsonLdScripts.map((script, index) => {
        try {
          return {
            index,
            data: JSON.parse(script.textContent),
            valid: true
          };
        } catch (e) {
          return {
            index,
            error: 'Invalid JSON-LD',
            content: script.textContent.substring(0, 100),
            valid: false
          };
        }
      });

      // Extract Microdata
      const microdataItems = Array.from(document.querySelectorAll('[itemscope]'));
      const microdata = microdataItems.map((item, index) => {
        return {
          index,
          type: item.getAttribute('itemtype'),
          id: item.getAttribute('itemid'),
          properties: Array.from(item.querySelectorAll('[itemprop]')).map(prop => ({
            name: prop.getAttribute('itemprop'),
            content: prop.getAttribute('content') || prop.textContent.trim().substring(0, 50)
          }))
        };
      });

      // Check for RDFa
      const rdfaElements = document.querySelectorAll('[typeof], [property]');

      return {
        jsonLd: jsonLdData,
        microdata,
        rdfa: rdfaElements.length > 0,
        totalSchemas: jsonLdData.filter(item => item.valid).length + microdata.length
      };
    });

    // Analyze schemas
    const analysis = this.analyzeSchemas(structuredData);

    // Detect industry
    const industry = await this.detectIndustry(page, analysis.schemaTypes);

    // Identify gaps based on industry
    const industryGaps = this.identifyIndustryGaps(industry, analysis.schemaTypes);

    return {
      ...structuredData,
      ...analysis,
      detected_industry: industry,
      industry_specific_gaps: industryGaps
    };
  }

  analyzeSchemas(structuredData) {
    const schemaTypes = new Set();
    const schemaQuality = [];
    const errors = [];

    // Analyze JSON-LD
    for (const jsonLd of structuredData.jsonLd) {
      if (!jsonLd.valid) {
        errors.push({
          type: 'json-ld',
          error: jsonLd.error,
          content: jsonLd.content
        });
        continue;
      }

      const types = this.extractSchemaTypes(jsonLd.data);
      types.forEach(type => schemaTypes.add(type));

      schemaQuality.push({
        type: jsonLd.data['@type'],
        format: 'json-ld',
        hasRequiredProperties: this.validateRequiredProperties(jsonLd.data),
        wellFormed: true
      });
    }

    // Analyze Microdata
    for (const item of structuredData.microdata) {
      if (item.type) {
        const typeName = item.type.split('/').pop();
        schemaTypes.add(typeName);

        schemaQuality.push({
          type: typeName,
          format: 'microdata',
          propertyCount: item.properties.length,
          wellFormed: true
        });
      }
    }

    // Calculate coverage score
    const coverageScore = this.calculateCoverageScore(Array.from(schemaTypes));

    return {
      schemaTypes: Array.from(schemaTypes),
      schemaCount: schemaTypes.size,
      coverageScore,
      quality: schemaQuality,
      errors,
      hasOrganization: schemaTypes.has('Organization'),
      hasWebSite: schemaTypes.has('WebSite'),
      hasBreadcrumb: schemaTypes.has('BreadcrumbList')
    };
  }

  extractSchemaTypes(jsonLd) {
    const types = [];

    if (jsonLd['@type']) {
      if (Array.isArray(jsonLd['@type'])) {
        types.push(...jsonLd['@type']);
      } else {
        types.push(jsonLd['@type']);
      }
    }

    // Recursively extract from @graph
    if (jsonLd['@graph']) {
      for (const item of jsonLd['@graph']) {
        types.push(...this.extractSchemaTypes(item));
      }
    }

    return types;
  }

  async detectIndustry(page, schemaTypes) {
    // Check schema types first (most reliable)
    if (schemaTypes.includes('Product') || schemaTypes.includes('Offer')) {
      return 'ecommerce';
    }
    if (schemaTypes.includes('SoftwareApplication')) {
      return 'saas';
    }
    if (schemaTypes.includes('TechArticle') || schemaTypes.includes('APIReference')) {
      return 'documentation';
    }
    if (schemaTypes.includes('NewsArticle')) {
      return 'news';
    }
    if (schemaTypes.includes('LocalBusiness')) {
      return 'local-business';
    }

    // Fallback: content-based detection
    const indicators = await page.evaluate(() => {
      const title = document.title.toLowerCase();
      const description = document.querySelector('meta[name="description"]')?.content.toLowerCase() || '';
      const h1 = document.querySelector('h1')?.textContent.toLowerCase() || '';
      return `${title} ${description} ${h1}`;
    });

    if (/shop|store|buy|cart|checkout|product|price/.test(indicators)) {
      return 'ecommerce';
    }
    if (/api|docs|documentation|guide|tutorial|reference/.test(indicators)) {
      return 'documentation';
    }
    if (/software|saas|platform|app|dashboard/.test(indicators)) {
      return 'saas';
    }
    if (/news|article|press|media|journalism/.test(indicators)) {
      return 'news';
    }
    if (/restaurant|hotel|local|business|hours|location/.test(indicators)) {
      return 'local-business';
    }

    return 'general';
  }

  identifyIndustryGaps(industry, currentSchemas) {
    const requirements = this.schemaTemplates.industries[industry] ||
                        this.schemaTemplates.industries.general;

    const missingRequired = requirements.required.filter(
      schema => !currentSchemas.includes(schema)
    );

    const missingRecommended = requirements.recommended.filter(
      schema => !currentSchemas.includes(schema)
    );

    return {
      required: missingRequired,
      recommended: missingRecommended,
      criticalGaps: missingRequired.length > 0,
      priorityScore: requirements.priority_score
    };
  }

  validateRequiredProperties(schema) {
    // Schema-specific required properties
    const requiredProps = this.schemaTemplates.schema_properties[schema['@type']];

    if (!requiredProps) return true; // No specific requirements

    const hasRequired = requiredProps.required?.every(prop => schema[prop] !== undefined);
    return hasRequired !== false;
  }

  calculateCoverageScore(schemaTypes) {
    let score = schemaTypes.length > 0 ? 40 : 0;

    // Core schemas (30 points)
    if (schemaTypes.includes('Organization')) score += 10;
    if (schemaTypes.includes('WebSite')) score += 10;
    if (schemaTypes.includes('BreadcrumbList')) score += 10;

    // Content-specific schemas (20 points)
    const contentSchemas = ['Article', 'Product', 'FAQPage', 'HowTo', 'NewsArticle', 'TechArticle'];
    const hasContentSchema = contentSchemas.some(s => schemaTypes.includes(s));
    if (hasContentSchema) score += 20;

    // Enhancement schemas (10 points)
    const enhancementSchemas = ['Review', 'AggregateRating', 'ImageObject'];
    const enhancementCount = enhancementSchemas.filter(s => schemaTypes.includes(s)).length;
    score += Math.min(10, enhancementCount * 5);

    return Math.min(100, score);
  }
}

module.exports = StructuredDataGatherer;
