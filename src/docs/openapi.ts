// The webhook is registered for both POST and GET, so the same operation is documented under both verbs.
const webhookOperation = {
    tags: ['Namirial'],
    summary: 'Signing provider callback',
    description:
        'Called by Namirial every time a signing workstep finishes. Only `action=workstepfinished` triggers work; any other value ' +
        '(or a missing `action`) is answered with `200` and ignored.\n\n' +
        'The same endpoint drives both steps of the flow, and which step runs is decided from the document\'s current `workflow_status`:\n\n' +
        '- `pending_emitent` (first call) — the row is claimed by moving it to `processing_invite` with a conditional update, so two ' +
        'simultaneous callbacks cannot both proceed. The supervisor\'s viewer link is fetched, the signing email (link + access code) is ' +
        'sent, and only then are `workflow_status` = `pending_sef_lucrare` and `emitent_signed_at` written.\n' +
        '- `processing_invite` (retry) — a previous attempt sent no email (the request threw before the status advanced), so the invite ' +
        'step is retried without re-claiming.\n' +
        '- `pending_sef_lucrare` (second call) — claimed by moving it to `processing_final_zip`, then the signed documents are downloaded, ' +
        'the merged PDF is uploaded to storage, a ZIP of all signed files is emailed to the supervisor, and only afterwards are ' +
        '`link_semnat`, `sef_lucrare_signed_at` and `workflow_status` = `completed` written.\n' +
        '- `processing_final_zip` (retry) — the finalisation step is retried the same way.\n' +
        '- `completed` — nothing happens.\n\n' +
        'Because the database is updated only after each email is actually sent, a crash or email failure leaves the document in its ' +
        '`processing_*` status, which is exactly the state a provider retry picks up. Registered for both POST and GET because the ' +
        'provider may call either verb.',
    parameters: [
        {
            name: 'secret',
            in: 'path',
            required: true,
            description:
                'Shared secret (`WEBHOOK_SECRET`). The callback url handed to the provider at envelope creation embeds it, and it is compared ' +
                'against the environment on every call. This is the only thing authenticating the endpoint — without it anyone who guessed an ' +
                'envelope id could drive the flow and trigger the emails carrying the signed documents.',
            schema: { type: 'string' }
        },
        {
            name: 'envelope',
            in: 'query',
            required: true,
            description: 'Namirial envelope id (`namirial_envelope_id` on the document).',
            schema: { type: 'string' }
        },
        {
            name: 'action',
            in: 'query',
            required: false,
            description:
                'Provider event, matched case-insensitively. Only `workstepfinished` is acted on; anything else is accepted and ignored.',
            schema: { type: 'string', enum: ['workstepfinished'] }
        }
    ],
    responses: {
        '200': {
            description: 'Callback processed, or accepted and ignored because `action` was not `workstepfinished`.',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: { success: { type: 'boolean', example: true } }
                    }
                }
            }
        },
        '401': {
            description: 'The secret in the path does not match `WEBHOOK_SECRET`. Nothing is read or written before this check.',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' },
                    example: { error: 'Forbidden' }
                }
            }
        },
        '400': {
            description: 'The `envelope` query parameter is missing.',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' },
                    example: { error: 'Missing envelope ID' }
                }
            }
        },
        '500': {
            description:
                'Processing failed (unknown envelope, database, signing provider or email error). The document keeps its `processing_*` ' +
                'status so the provider can safely retry the same callback.',
            content: { 'text/plain': { schema: { type: 'string', example: 'Internal Server Error' } } }
        }
    }
};

export const openapiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Permis Electric de Munca API',
        version: '1.0.0',
        description:
            'API for issuing and electronically signing "permis electric de munca" documents.\n\n' +
            'Authentication uses JWT bearer tokens issued by `/api/auth/login`; logged-out tokens are blacklisted in Redis until they expire.\n\n' +
            'Signing is delegated to Namirial, which calls back into `/api/namirial/webhook/{secret}`. A document\'s progress is tracked by a single ' +
            '`workflow_status` column that also acts as the concurrency and retry mechanism: transitions into the transient `processing_*` ' +
            'statuses are conditional updates, so two simultaneous callbacks cannot both do the same work, and the status only advances after ' +
            'the side effect it guards (an email) has actually succeeded. See the `WorkflowStatus` schema and the webhook operation for the ' +
            'full state machine.'
    },
    servers: [
        { url: 'http://localhost:3030', description: 'Local development' }
    ],
    tags: [
        { name: 'Auth', description: 'Signup, login and logout' },
        { name: 'Documents', description: 'Create and read work permit documents' },
        { name: 'Namirial', description: 'Signing-provider webhook callbacks' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Paste the `token` returned by `POST /api/auth/login`.'
            }
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    error: {
                        description: 'Error message. Supabase failures return the raw error object instead of a string.',
                        oneOf: [{ type: 'string' }, { type: 'object' }],
                        example: 'Invalid credentials'
                    },
                    code: {
                        type: 'string',
                        description: 'Machine-readable code. Only sent for an expired JWT.',
                        example: 'token_expired'
                    }
                }
            },
            SignupRequest: {
                type: 'object',
                required: ['email', 'username', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'emitent@example.com' },
                    username: {
                        type: 'string',
                        description: 'Full name, space separated. The first token is used as "nume" and the rest as "prenume" when building the signing envelope.',
                        example: 'Popescu Ion'
                    },
                    password: { type: 'string', format: 'password', example: 'parola-secreta' }
                }
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'emitent@example.com' },
                    password: { type: 'string', format: 'password', example: 'parola-secreta' }
                }
            },
            LoginResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    token: {
                        type: 'string',
                        description: 'JWT valid for 1 day.',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                }
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email', example: 'emitent@example.com' },
                    username: {
                        type: 'string',
                        description: 'Full name, space separated. The first token is used as "nume" and the rest as "prenume" when building the signing envelope.',
                        example: 'Popescu Ion'
                    }
                }
            },
            WorkflowStatus: {
                type: 'string',
                description:
                    'Single source of truth for how far the document has progressed. The `processing_*` values are transient claims: a ' +
                    'callback moves the row into one before doing work that can fail (sending an email), and only moves it out once that ' +
                    'work succeeded. A document left in a `processing_*` status is therefore a retry candidate, not a corrupt row.\n\n' +
                    '- `pending_emitent` — created, waiting for the issuer to sign.\n' +
                    '- `processing_invite` — the issuer signed and the invite email to the work supervisor is being sent.\n' +
                    '- `pending_sef_lucrare` — the invite was delivered, waiting for the work supervisor to sign.\n' +
                    '- `processing_final_zip` — both signed; the signed files are being downloaded, stored and emailed.\n' +
                    '- `completed` — the signed PDF is stored and the ZIP was emailed to the work supervisor.',
                enum: ['pending_emitent', 'processing_invite', 'pending_sef_lucrare', 'processing_final_zip', 'completed'],
                example: 'pending_sef_lucrare'
            },
            Document: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: {
                        type: 'string',
                        description: 'Generated file name, also used as the storage object name.',
                        example: 'Permis Ionescu Vasile - 1753876543210-6f1c2b7a-0f4e-4a2e-9a5b-1c0d8e3f6b21.pdf'
                    },
                    workflow_status: { $ref: '#/components/schemas/WorkflowStatus' },
                    user_id: { type: 'string', format: 'uuid', description: 'Owner (issuer) of the document.' },
                    sef_lucrare_email: { type: 'string', format: 'email', example: 'sef.lucrare@example.com' },
                    emitent_signed_at: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'When the issuer\'s signature was confirmed. Written together with `pending_sef_lucrare`, i.e. only after the invite email went out.'
                    },
                    sef_lucrare_signed_at: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'When the work supervisor\'s signature was confirmed. Written together with `completed`.'
                    },
                    link_generat: { type: 'string', format: 'uri', description: 'Public URL of the unsigned PDF in Supabase storage.' },
                    link_semnat: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        description: 'Public URL of the fully signed PDF. Populated only once `workflow_status` is `completed`.'
                    },
                    link_expiration_date: { type: 'string', format: 'date-time' },
                    namirial_envelope_id: { type: 'string', description: 'Envelope identifier at the signing provider.' },
                    cod_acces: {
                        type: 'string',
                        description: '6-character access code the work supervisor must enter before signing. Emailed together with the signing link.',
                        example: 'aB3xY9'
                    },
                    created_at: { type: 'string', format: 'date-time' }
                }
            },
            DocumentStats: {
                type: 'object',
                description:
                    'Counts over the current user\'s documents, derived from `workflow_status`. The transient `processing_*` statuses are folded ' +
                    'into the bucket of the party they are actually blocked on, so the three buckets always add up to `total`: ' +
                    '`processing_invite` counts as waiting for the work supervisor (the issuer has already signed), and `processing_final_zip` ' +
                    'counts as completed (both signatures are in; only the storage upload and the final email remain).',
                properties: {
                    total: { type: 'integer', description: 'Every document owned by the user.', example: 12 },
                    completed: {
                        type: 'integer',
                        description: 'Status `completed` or `processing_final_zip`.',
                        example: 7
                    },
                    sefLucrareSignNeeded: {
                        type: 'integer',
                        description: 'Status `pending_sef_lucrare` or `processing_invite` — waiting for the work supervisor to sign.',
                        example: 3
                    },
                    emitentSignNeeded: {
                        type: 'integer',
                        description: 'Status `pending_emitent` — waiting for the issuer to sign.',
                        example: 2
                    }
                }
            },
            PdfData: {
                type: 'object',
                description:
                    'Values written into the AcroForm fields of the work permit template (`src/assets/PERMIS_ELECTRIC_acroform.pdf`), which is ' +
                    'flattened afterwards so nothing stays editable.\n\n' +
                    '**The array properties do not carry the raw PDF field names.** Each one is a group of checkboxes sharing a prefix, and the ' +
                    'prefix is re-added server side — send `arc_electric`, and the box `risc_arc_electric` is ticked. The enum on every array is ' +
                    'therefore the complete, authoritative list of what that group accepts; the `x-pdf-field-prefix` on each shows what gets ' +
                    'prepended. Every other property is a text field whose name is used verbatim.\n\n' +
                    '**Unknown values are not ignored — they throw.** A value outside an enum, or a fourth entry in `executanti`, makes the PDF ' +
                    'library fail on a missing field and the request returns `500`. Validate against these enums in the client.\n\n' +
                    '**Diacritics:** the PDF is filled with the standard WinAnsi-encoded Helvetica, which cannot encode `ă Ă ș Ș ț Ț ş Ş ţ Ţ` — any ' +
                    'of those characters in a text value fails the request with `500`. `â Â î Î` are fine. Strip the rest client side until a ' +
                    'Unicode font is embedded.',
                required: [
                    'data', 'locatia', 'instalatia', 'tipLucrare', 'descriere_lucrare', 'executanti',
                    'riscuri', 'masuri', 'echipamente', 'confirmari', 'ora_inceput', 'ora_sfarsit',
                    'observatii', 'inchidere_permis'
                ],
                properties: {
                    data: {
                        type: 'string',
                        description: 'Issue date, free text. Written to the `data` field and reused for `data_valabilitate`.',
                        example: '31.07.2026'
                    },
                    locatia: { type: 'string', description: 'PDF field `locatia`.', example: 'Parc fotovoltaic Galati Sud, sector B' },
                    instalatia: { type: 'string', description: 'PDF field `instalatia`.', example: 'Invertor central INV-04, string-uri 12-18' },
                    tipLucrare: {
                        type: 'string',
                        description:
                            'Ticks exactly one of the `tip_lucrare_*` boxes. Matched case-insensitively (lowercased server side), so `MENTENANTA` ' +
                            'works. Note the last value is `altul`, not `alte`.',
                        'x-pdf-field-prefix': 'tip_lucrare_',
                        enum: ['mentenanta', 'interventie', 'testare', 'altul'],
                        example: 'mentenanta'
                    },
                    descriere_lucrare: {
                        type: 'string',
                        description: 'PDF field `descriere_lucrare` (multiline).',
                        example: 'Inlocuire sigurante fuzibile DC pe string-urile 12-18.'
                    },
                    executanti: {
                        type: 'array',
                        description:
                            'Filled into `executant_1` … `executant_3` in order. **The template has only three slots** — a fourth entry throws and ' +
                            'returns `500`. An empty array is accepted and leaves all three blank.',
                        maxItems: 3,
                        items: { type: 'string' },
                        example: ['Ionescu Marius - electrician autorizat gr. IV', 'Dumitrescu Andrei - electrician autorizat gr. III']
                    },
                    riscuri: {
                        type: 'array',
                        description:
                            'Identified risks. `tensiuni_reziduale_r2` is a second, separate box in the template alongside `tensiuni_reziduale`.',
                        'x-pdf-field-prefix': 'risc_',
                        items: {
                            type: 'string',
                            enum: [
                                'electrocutare_ac', 'electrocutare_dc', 'arc_electric', 'tensiuni_reziduale',
                                'tensiuni_reziduale_r2', 'backfeed', 'lucru_inaltime', 'conditii_meteo', 'alte'
                            ]
                        },
                        example: ['electrocutare_dc', 'arc_electric', 'backfeed']
                    },
                    masuri: {
                        type: 'array',
                        description: 'Safety measures taken before work starts.',
                        'x-pdf-field-prefix': 'masuri_',
                        items: {
                            type: 'string',
                            enum: [
                                'deconectare_instalatie', 'separare_vizibila', 'verificare_lipsa_tensiune',
                                'punere_pamant_scurtcircuit', 'aplicare_loto', 'delimitare_semnalizare',
                                'verificare_absenta_tensiune_dc', 'descarcare_tensiuni_reziduale_invertor',
                                'alte_foaie_manevra'
                            ]
                        },
                        example: ['deconectare_instalatie', 'verificare_lipsa_tensiune', 'aplicare_loto']
                    },
                    echipamente: {
                        type: 'array',
                        description: 'Personal protective equipment. Note the prefix is `eip_`, not `echipamente_`.',
                        'x-pdf-field-prefix': 'eip_',
                        items: {
                            type: 'string',
                            enum: [
                                'manusi_electroizolante', 'casca_protectie', 'ochelari_protectie',
                                'incaltaminte_dielectrica', 'imbracaminte_ignifuga', 'ham', 'alte'
                            ]
                        },
                        example: ['manusi_electroizolante', 'casca_protectie', 'incaltaminte_dielectrica']
                    },
                    confirmari: {
                        type: 'array',
                        description:
                            'Pre-work confirmations by the work supervisor. Only these four values are checkboxes — the template also has a text ' +
                            'field `confirm_sef_lucrare_nume`, but that is filled from the supervisor\'s name and must never be sent here.',
                        'x-pdf-field-prefix': 'confirm_',
                        items: {
                            type: 'string',
                            enum: ['scoasa_sub_tensiune', 'masuri_securitate', 'zona_sigura', 'personal_instruit']
                        },
                        example: ['scoasa_sub_tensiune', 'masuri_securitate', 'zona_sigura', 'personal_instruit']
                    },
                    ora_inceput: { type: 'string', description: 'PDF field `ora_inceput`, free text.', example: '08:30' },
                    ora_sfarsit: { type: 'string', description: 'PDF field `ora_sfarsit`, free text.', example: '16:00' },
                    observatii: { type: 'string', description: 'PDF field `observatii` (multiline).', example: 'Lucrarea se suspenda la vant peste 12 m/s.' },
                    inchidere_permis: {
                        type: 'array',
                        description:
                            'Permit close-out confirmations. Send `[]` for a permit that is still open. As with `confirmari`, the `inchidere_` ' +
                            'prefix is also used by text fields in the template — only these three values are checkboxes.',
                        'x-pdf-field-prefix': 'inchidere_',
                        items: {
                            type: 'string',
                            enum: ['lucrare_finalizata', 'zona_stare_initiala', 'instalatie_repusa']
                        },
                        example: ['lucrare_finalizata', 'zona_stare_initiala', 'instalatie_repusa']
                    },
                    emitent_permis_nume: {
                        type: 'string',
                        readOnly: true,
                        description:
                            'Do not send. Overwritten server side from the authenticated user\'s stored `username` before the PDF is filled, and ' +
                            'also copied into `emitent_final_nume`. Anything the client sends here is discarded.'
                    },
                    sef_lucrare_nume: {
                        type: 'string',
                        readOnly: true,
                        description:
                            'Do not send. Overwritten server side from `numeSefLucrare` + `prenumeSefLucrare`, and also copied into ' +
                            '`confirm_sef_lucrare_nume` and `inchidere_sef_lucrare_nume`. Anything the client sends here is discarded.'
                    }
                }
            },
            PermitFormFieldsNotFilled: {
                type: 'object',
                description:
                    'Reference only — AcroForm fields that exist in the template but that no property of `PdfData` currently reaches, listed so ' +
                    'the frontend does not expect them to appear in the generated PDF:\n\n' +
                    '- `risc_alte_text`, `eip_alte_text`, `tip_lucrare_altul_text` — the free-text lines beside the "alte"/"altul" boxes. Selecting ' +
                    '`alte` ticks the box but leaves the line blank, because `PdfData` has no property to carry the text.\n' +
                    '- `inchidere_data_zi`, `inchidere_data_luna`, `inchidere_data_an`, `inchidere_ora` — the close-out date/time block, always empty.\n' +
                    '- `emitent_permis_semnatura`, `sef_lucrare_semnatura`, `confirm_sef_lucrare_semnatura`, `inchidere_sef_lucrare_semnatura`, ' +
                    '`emitent_final_semnatura` — signature fields, left empty on purpose. Signatures are applied by Namirial at fixed page ' +
                    'coordinates, not through the form.'
            },
            NewDocumentRequest: {
                type: 'object',
                description:
                    'All five fields are mandatory. The initial status is not accepted from the client — the row is created with ' +
                    '`workflow_status` = `pending_emitent`.',
                required: ['link_expiration_date', 'emailSefLucrare', 'numeSefLucrare', 'prenumeSefLucrare', 'pdfData'],
                properties: {
                    link_expiration_date: {
                        type: 'string',
                        format: 'date-time',
                        description: 'When the signing link should stop being valid.',
                        example: '2026-08-30T12:00:00.000Z'
                    },
                    emailSefLucrare: {
                        type: 'string',
                        format: 'email',
                        description: 'Email of the work supervisor, who signs second and receives both the signing link and the final signed ZIP by email.',
                        example: 'sef.lucrare@example.com'
                    },
                    numeSefLucrare: { type: 'string', description: 'Last name of the work supervisor, also used in the generated file name.', example: 'Ionescu' },
                    prenumeSefLucrare: { type: 'string', description: 'First name of the work supervisor.', example: 'Vasile' },
                    pdfData: { $ref: '#/components/schemas/PdfData' }
                }
            }
        },
        responses: {
            Unauthorized: {
                description: 'Missing, malformed, expired or blacklisted (logged out) bearer token.',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Error' },
                        examples: {
                            missing: { summary: 'No Authorization header', value: { error: 'You are not authenticated' } },
                            expired: { summary: 'Expired token', value: { error: 'Token expired', code: 'token_expired' } },
                            invalid: { summary: 'Invalid token', value: { error: 'Could not validate credentials' } },
                            loggedOut: { summary: 'Blacklisted token', value: { error: 'Token has been invalidated (logged out)' } }
                        }
                    }
                }
            }
        }
    },
    paths: {
        '/api/auth/signup': {
            post: {
                tags: ['Auth'],
                summary: 'Register a new user',
                description: 'Creates a user after checking that neither the email nor the username is already taken. The password is stored as a bcrypt hash.',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } }
                },
                responses: {
                    '200': {
                        description: 'User created.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: { success: { type: 'boolean', example: true } }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'One of `email`, `username` or `password` is missing or not a string.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'Invalid signup fields' }
                            }
                        }
                    },
                    '409': {
                        description: 'Email or username already in use.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    email: { value: { error: 'Email is already used' } },
                                    username: { value: { error: 'Username is already used' } }
                                }
                            }
                        }
                    },
                    '500': {
                        description: 'Database check failed, insert failed, or an unexpected error occurred.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
                    }
                }
            }
        },
        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Log in and receive a JWT',
                description: 'Verifies the credentials and returns a JWT that expires after 1 day. The token carries a `jwtId` used to blacklist it on logout.',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
                },
                responses: {
                    '200': {
                        description: 'Authenticated.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
                    },
                    '401': {
                        description: 'Credentials missing or invalid.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    missing: { value: { error: 'Credentials are mandatory' } },
                                    invalid: { value: { error: 'Invalid credentials' } }
                                }
                            }
                        }
                    },
                    '500': {
                        description: 'Database error.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
                    }
                }
            }
        },
        '/api/auth/logout': {
            post: {
                tags: ['Auth'],
                summary: 'Log out the current user',
                description: 'Adds the presented token to a Redis blacklist with a TTL equal to its remaining lifetime, so it can no longer be used.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Token blacklisted.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Logged out succesfully' }
                                    }
                                }
                            }
                        }
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': {
                        description: 'Failed to process logout.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
                    }
                }
            }
        },
        '/api/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Get the currently authenticated user',
                description: 'Resolves the presented token back into a user. The JWT payload only carries ids, so this is how a client that has just reloaded the page recovers the name and email to display. It also doubles as a startup check: a 401 here means the stored token is expired, blacklisted or orphaned, and the client should send the user back to login.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'User retrieved.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/User' }
                                    }
                                }
                            }
                        }
                    },
                    '401': {
                        description: 'The token is missing, invalid, expired or blacklisted, or it is valid but no longer points at an existing user (for example a deleted account).',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    unauthenticated: { value: { error: 'You are not authenticated' } },
                                    deleted: { value: { error: 'User not found' } }
                                }
                            }
                        }
                    },
                    '500': {
                        description: 'Database error.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
                    }
                }
            }
        },
        '/api/documents/all': {
            get: {
                tags: ['Documents'],
                summary: 'List the current user\'s documents',
                description: 'Returns every document owned by the authenticated user, newest first. A user with no documents gets a 200 with an empty array, not a 404.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Documents retrieved. The array is empty when the user has no documents.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Sucessfully retrieved all documents' },
                                        data: { type: 'array', items: { $ref: '#/components/schemas/Document' } }
                                    }
                                }
                            }
                        }
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': {
                        description: 'Database error.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
                    }
                }
            }
        },
        '/api/documents/stats': {
            get: {
                tags: ['Documents'],
                summary: 'Counts of the current user\'s documents by stage',
                description:
                    'Dashboard summary for the authenticated user: how many permits exist in total, how many are done, and how many are blocked ' +
                    'on each signer. Scoped to the caller, so the numbers never include another user\'s documents.\n\n' +
                    'Declared before `/api/documents/{id}` in the router — otherwise `stats` would be captured as an id and answered with a 404 ' +
                    'from the single-document handler.\n\n' +
                    'A user with no documents gets a 200 with every count at `0`, not a 404. See the `DocumentStats` schema for how the ' +
                    'transient `processing_*` statuses are attributed.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Statistics computed. All counts are `0` when the user has no documents.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        stats: { $ref: '#/components/schemas/DocumentStats' }
                                    }
                                }
                            }
                        }
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': {
                        description: 'Database error.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'Internal server error' }
                            }
                        }
                    }
                }
            }
        },
        '/api/documents/{id}': {
            get: {
                tags: ['Documents'],
                summary: 'Get one document by id',
                description: 'Returns a single document, scoped to the authenticated user so one user cannot read another user\'s documents.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Document id.',
                        schema: { type: 'string', format: 'uuid' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Document retrieved.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Successfully retrieved document' },
                                        data: { $ref: '#/components/schemas/Document' }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Error while retrieving the document (for example a malformed id).',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'Error while retrieving document with id ' }
                            }
                        }
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '404': {
                        description: 'No document with that id belongs to the current user.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'No document was found with id ' }
                            }
                        }
                    }
                }
            }
        },
        '/api/documents/{id}/download': {
            get: {
                tags: ['Documents'],
                summary: 'Download the signed documents as a ZIP',
                description:
                    'Returns a ZIP containing the signed PDF and `AuditTrail.pdf`. The same archive is emailed to the work supervisor when the ' +
                    'flow completes; this lets the issuer fetch it again at any time.\n\n' +
                    'The document is scoped to the authenticated user and must have `workflow_status` = `completed` with a non-null ' +
                    '`link_semnat`. Anything else — unknown id, another user\'s document, or one that is not finished signing — is answered ' +
                    'with the same 404, so the endpoint does not reveal whether a document exists.\n\n' +
                    'The files are fetched from the signing provider on every call rather than served from storage, because only the signed PDF ' +
                    'is mirrored to Supabase (as `link_semnat`) — the audit trail is not.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Document id, the same one accepted by `GET /api/documents/{id}` — not the `namirial_envelope_id`.',
                        schema: { type: 'string', format: 'uuid' }
                    }
                ],
                responses: {
                    '200': {
                        description:
                            'ZIP archive containing the signed PDF under its original file name plus `AuditTrail.pdf`. Sent with ' +
                            '`Content-Disposition: attachment; filename="permis_electric_munca_{id}.zip"`, where `{id}` is the document id from ' +
                            'the path.',
                        content: {
                            'application/zip': {
                                schema: { type: 'string', format: 'binary' }
                            }
                        }
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '404': {
                        description: 'No document with that id belongs to the current user, or it exists but has not reached `completed` yet.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                example: { error: 'Document not found' }
                            }
                        }
                    },
                    '500': {
                        description:
                            'The document lookup failed, or downloading the files from the signing provider or building the ZIP threw. The ' +
                            'underlying message is logged server side and not returned.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    lookup: { summary: 'Database error', value: { error: 'Internal server error' } },
                                    download: { summary: 'Provider or ZIP failure', value: { error: 'Failed to download document' } }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/documents/new': {
            post: {
                tags: ['Documents'],
                summary: 'Create a document and start the signing flow',
                description:
                    'Fills the work permit AcroForm template from `pdfData` and flattens it, uploads the result to Supabase storage under a unique ' +
                    'name, creates a Namirial signing envelope with two signers (the authenticated user as issuer, plus the work supervisor), ' +
                    'generates a 6-character access code, and stores the document row with `workflow_status` = `pending_emitent`. The issuer\'s ' +
                    'name is split out of their stored `username`: the first token becomes "nume" and the rest "prenume". The issuer signs first; ' +
                    'the rest of the flow is driven by `/api/namirial/webhook/{secret}`.\n\n' +
                    'See the `PdfData` schema for the exact set of accepted checkbox values — they are validated only by the PDF library, so an ' +
                    'unrecognised one surfaces as a `500`, not a `400`.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/NewDocumentRequest' } } }
                },
                responses: {
                    '201': {
                        description: 'Document created and envelope sent for signing.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Successfully inserted data' },
                                        data: { $ref: '#/components/schemas/Document' }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description:
                            'A top-level field is missing (only presence is checked — `pdfData` itself is not validated), the issuer\'s user record ' +
                            'could not be read, or the insert was rejected.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    fields: { summary: 'Missing input', value: { error: 'Input data is invalid' } },
                                    user: { summary: 'Issuer lookup failed', value: { error: 'Failed to fetch user data' } },
                                    insert: { summary: 'Insert rejected', value: { error: { message: 'insert or update on table "documents" violates foreign key constraint' } } }
                                }
                            }
                        }
                    },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '500': {
                        description:
                            'PDF template not found, filling the form failed, storage upload failed, public URL unavailable, or the envelope could ' +
                            'not be created.\n\n' +
                            'Bad `pdfData` lands here rather than in `400`: the form filler throws on the first unknown field name or unencodable ' +
                            'character, and the handler\'s catch-all returns the raw message. The `checkbox`, `executanti` and `diacritics` examples ' +
                            'below are all client-fixable — see the `PdfData` schema.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Error' },
                                examples: {
                                    pdf: { value: { error: 'Could not find PDF' } },
                                    checkbox: {
                                        summary: 'Value outside an enum in pdfData',
                                        value: { error: 'PDFDocument has no form field with the name "risc_nu_exista"' }
                                    },
                                    executanti: {
                                        summary: 'More than three executanti',
                                        value: { error: 'PDFDocument has no form field with the name "executant_4"' }
                                    },
                                    diacritics: {
                                        summary: 'Romanian diacritic the standard font cannot encode',
                                        value: { error: 'WinAnsi cannot encode "ț" (0x021b)' }
                                    },
                                    storage: { value: { error: 'Error while saving the document to the bucket' } },
                                    url: { value: { error: 'Could not get the URL where the doc is stored' } },
                                    envelope: { summary: 'Signing provider rejected the envelope', value: { error: 'Namirial error: 400 Bad Request' } }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/namirial/webhook/{secret}': {
            post: webhookOperation,
            get: webhookOperation
        }
    }
};
