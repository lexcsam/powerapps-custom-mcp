/**
 * Dataverse Web API client.
 * Full OData v4 client for /api/data/v9.2/ endpoints.
 */

import { getConfig } from "../config.js";
import { getDataverseToken } from "../auth/token-manager.js";
import { httpRequest } from "./http-client.js";
import {
  buildODataQuery,
  entitySetUrl,
  formatGuid,
  type ODataQueryOptions,
} from "../utils/odata-helpers.js";

function baseUrl(): string {
  return getConfig().dataverseUrl;
}

/* ─── Record CRUD ────────────────────────────────────────── */

export async function createRecord(
  entitySet: string,
  data: Record<string, unknown>
): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(entitySetUrl(baseUrl(), entitySet), token, {
    method: "POST",
    body: data,
    headers: { Prefer: "return=representation" },
  });
}

export async function getRecord(
  entitySet: string,
  recordId: string,
  select?: string[]
): Promise<unknown> {
  const token = await getDataverseToken();
  const query = select ? buildODataQuery({ select }) : "";
  return httpRequest(
    `${entitySetUrl(baseUrl(), entitySet, formatGuid(recordId))}${query}`,
    token
  );
}

export async function updateRecord(
  entitySet: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    entitySetUrl(baseUrl(), entitySet, formatGuid(recordId)),
    token,
    {
      method: "PATCH",
      body: data,
      headers: { Prefer: "return=representation" },
    }
  );
}

export async function deleteRecord(
  entitySet: string,
  recordId: string
): Promise<void> {
  const token = await getDataverseToken();
  await httpRequest(
    entitySetUrl(baseUrl(), entitySet, formatGuid(recordId)),
    token,
    { method: "DELETE" }
  );
}

export async function queryRecords(
  entitySet: string,
  options: ODataQueryOptions = {}
): Promise<unknown> {
  const token = await getDataverseToken();
  const query = buildODataQuery(options);
  return httpRequest(`${entitySetUrl(baseUrl(), entitySet)}${query}`, token);
}

/* ─── Table / Entity Metadata ────────────────────────────── */

export async function listTables(customOnly = false): Promise<unknown> {
  const token = await getDataverseToken();
  let query =
    "?$select=LogicalName,DisplayName,EntitySetName,Description,IsCustomEntity,IsManaged";
  if (customOnly) {
    query += "&$filter=IsCustomEntity eq true";
  }
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/EntityDefinitions${query}`,
    token
  );
}

export async function describeTable(logicalName: string): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')?$expand=Attributes($select=LogicalName,DisplayName,AttributeType,RequiredLevel,MaxLength,Description)`,
    token
  );
}

export async function createCustomTable(params: {
  schemaName: string;
  displayName: string;
  pluralName: string;
  description?: string;
  primaryAttributeName: string;
  primaryAttributeDisplayName: string;
  primaryAttributeMaxLength?: number;
}): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(`${baseUrl()}/api/data/v9.2/EntityDefinitions`, token, {
    method: "POST",
    body: {
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
      SchemaName: params.schemaName,
      DisplayName: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [
          {
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: params.displayName,
            LanguageCode: 1033,
          },
        ],
      },
      DisplayCollectionName: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [
          {
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: params.pluralName,
            LanguageCode: 1033,
          },
        ],
      },
      Description: {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        LocalizedLabels: [
          {
            "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
            Label: params.description ?? "",
            LanguageCode: 1033,
          },
        ],
      },
      HasActivities: false,
      HasNotes: false,
      OwnershipType: "UserOwned",
      PrimaryNameAttribute: params.primaryAttributeName.toLowerCase(),
      Attributes: [
        {
          "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
          SchemaName: params.primaryAttributeName,
          AttributeType: "String",
          FormatName: { Value: "Text" },
          MaxLength: params.primaryAttributeMaxLength ?? 200,
          RequiredLevel: { Value: "ApplicationRequired" },
          DisplayName: {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            LocalizedLabels: [
              {
                "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                Label: params.primaryAttributeDisplayName,
                LanguageCode: 1033,
              },
            ],
          },
          IsPrimaryName: true,
        },
      ],
    },
  });
}

export async function addColumn(
  entityLogicalName: string,
  attribute: {
    schemaName: string;
    displayName: string;
    attributeType: string;
    maxLength?: number;
    required?: boolean;
    description?: string;
  }
): Promise<unknown> {
  const token = await getDataverseToken();

  const typeMap: Record<string, string> = {
    String: "Microsoft.Dynamics.CRM.StringAttributeMetadata",
    Integer: "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
    Decimal: "Microsoft.Dynamics.CRM.DecimalAttributeMetadata",
    Boolean: "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
    DateTime: "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
    Money: "Microsoft.Dynamics.CRM.MoneyAttributeMetadata",
    Memo: "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
  };

  const odataType =
    typeMap[attribute.attributeType] ??
    "Microsoft.Dynamics.CRM.StringAttributeMetadata";

  const body: Record<string, unknown> = {
    "@odata.type": odataType,
    SchemaName: attribute.schemaName,
    AttributeType: attribute.attributeType,
    RequiredLevel: {
      Value: attribute.required ? "ApplicationRequired" : "None",
    },
    DisplayName: {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      LocalizedLabels: [
        {
          "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
          Label: attribute.displayName,
          LanguageCode: 1033,
        },
      ],
    },
    Description: {
      "@odata.type": "Microsoft.Dynamics.CRM.Label",
      LocalizedLabels: [
        {
          "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
          Label: attribute.description ?? "",
          LanguageCode: 1033,
        },
      ],
    },
  };

  if (attribute.maxLength && attribute.attributeType === "String") {
    body.MaxLength = attribute.maxLength;
    body.FormatName = { Value: "Text" };
  }

  return httpRequest(
    `${baseUrl()}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`,
    token,
    { method: "POST", body }
  );
}

/* ─── Solutions ──────────────────────────────────────────── */

export async function listSolutions(): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/solutions?$select=friendlyname,uniquename,version,ismanaged,description,createdon&$filter=isvisible eq true&$orderby=createdon desc`,
    token
  );
}

export async function createSolution(params: {
  uniqueName: string;
  displayName: string;
  publisherPrefix: string;
  version?: string;
  description?: string;
}): Promise<unknown> {
  const token = await getDataverseToken();

  const publisherResult = (await httpRequest(
    `${baseUrl()}/api/data/v9.2/publishers?$filter=customizationprefix eq '${params.publisherPrefix}'&$select=publisherid`,
    token
  )) as { value: Array<{ publisherid: string }> };

  if (!publisherResult.value || publisherResult.value.length === 0) {
    throw new Error(
      `Publisher with prefix '${params.publisherPrefix}' not found. Create a publisher first in the Power Platform Admin Center.`
    );
  }

  const publisherId = publisherResult.value[0].publisherid;

  return httpRequest(`${baseUrl()}/api/data/v9.2/solutions`, token, {
    method: "POST",
    body: {
      uniquename: params.uniqueName,
      friendlyname: params.displayName,
      version: params.version ?? "1.0.0.0",
      description: params.description ?? "",
      "publisherid@odata.bind": `/publishers(${publisherId})`,
    },
    headers: { Prefer: "return=representation" },
  });
}

export async function exportSolution(
  solutionUniqueName: string,
  managed: boolean = false
): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/ExportSolution`,
    token,
    {
      method: "POST",
      body: {
        SolutionName: solutionUniqueName,
        Managed: managed,
      },
    }
  );
}

export async function importSolution(
  solutionFileBase64: string,
  overwriteUnmanaged: boolean = true
): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/ImportSolution`,
    token,
    {
      method: "POST",
      body: {
        CustomizationFile: solutionFileBase64,
        OverwriteUnmanagedCustomizations: overwriteUnmanaged,
        PublishWorkflows: true,
      },
    }
  );
}

/* ─── Security Roles ─────────────────────────────────────── */

export async function listSecurityRoles(): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/roles?$select=name,roleid,ismanaged&$orderby=name`,
    token
  );
}

export async function assignSecurityRole(
  userId: string,
  roleId: string
): Promise<unknown> {
  const token = await getDataverseToken();
  return httpRequest(
    `${baseUrl()}/api/data/v9.2/systemusers(${formatGuid(userId)})/systemuserroles_association/$ref`,
    token,
    {
      method: "POST",
      body: {
        "@odata.id": `${baseUrl()}/api/data/v9.2/roles(${formatGuid(roleId)})`,
      },
    }
  );
}
