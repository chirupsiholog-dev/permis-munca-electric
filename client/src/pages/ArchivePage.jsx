import { useOutletContext } from 'react-router-dom'

import PageTransition from '../components/layout/PageTransition.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import ArchiveTable from '../features/archive/ArchiveTable.jsx'
import { FILTERS, useArchiveFilters } from '../features/archive/useArchiveFilters.js'
import { useEffect, useState } from 'react'

export default function ArchivePage() {
  const { profile } = useOutletContext()
  const [ permits, setPermits ] = useState([])
  const [ loading, setLoading ] = useState(true)

  const { filter, setFilter, query, setQuery, rows } = useArchiveFilters(permits)

  useEffect(() => {
    const token = localStorage.getItem('token');
    const permits = fetch('/api/documents/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }).then((res) => {
      if (!res.ok) {
        throw new Error('Nu s-au putut incarca documentele');
      }
      return res.json();
    }).then((d) => {
      let rows = []
      for (const row of d.data) {
        rows.push({
          id: row.id,
          data: new Date(row.created_at).toLocaleDateString('ro-RO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
          instalatie: row.instalatie,
          locatie: row.locatie,
          tip: row.tip,
          sef: row.sef_lucrare_email,
          emitentSemnat: row.emitent_signed_at ? true : false,
          sefSemnat: row.sef_lucrare_signed_at ? true : false,
          codAcces: row.cod_acces,
          emitentSigningLink: row.emitent_signing_link,
          sefLucrareSigningLink: row.sef_lucrare_signing_link
        });
      }
      setPermits(rows);
    }) //save json array to state
    .catch((err) => console.error(err))
    .finally(() => setLoading(false))
  }, [])

  const handleOpen = (row) => {
    //if emitent has not signed yet, we need to open the signing link for the emitent
    if (!row.emitentSemnat) {
      if (row.emitentSigningLink) {
        window.open(row.emitentSigningLink, '_blank', 'noopener,noreferrer');
      }
      else {
        alert('Link-ul de semnare pentru emitent nu este disponibil');
      }
      return;
    }

    //if emitent has signed but sef lucrare has not signed yet
    if (!row.sefSemnat) {
      if (row.sefLucrareSigningLink) {
        //open the signing link for sef lucrare
        window.open(row.sefLucrareSigningLink, '_blank', 'noopener,noreferrer');
      }
      else {
        alert('Link-ul de semnare pentru sef lucrare nu este disponibil');
      }
      return;
    }

    handleDownload(row); //both emitent and sef lucrare have signed, redirect to handleDownload for the finished document
  }


  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-7 pb-[72px] pt-10">
        <PageHeading
          title="Arhivă permise"
          subtitle="Toate permisele emise de tine, cu starea documentului și a semnăturilor."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            label="Filtrează permisele"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după locație, instalație sau șef de lucrare"
            aria-label="Caută permise"
            className="h-10 w-[340px] max-w-full border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>

        <ArchiveTable
          rows={rows}
          total={permits.length}
          loading={loading}
          emitentNume={profile.numeAfisat}
          onOpen={(row) => handleOpen(row)}
          onDownload={() => {}}
        />
      </main>
    </PageTransition>
  )
}
