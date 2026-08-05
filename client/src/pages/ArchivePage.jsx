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
          onDownload={async(permitId) => {
            try{
              const jwt = localStorage.getItem('token');
              const res = await fetch(`/api/documents/${permitId}/download`,
                {headers: {
                  Authorization: `Bearer ${jwt}`
                }}
              );
              if(!res.ok){
                throw new Error('Internal server error');
              }

              let filename = '';
              //extract the name from the content disposition header
              const disposition = res.headers.get('Content-Disposition')
              const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
              const matches = filenameRegex.exec(disposition);
              if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, ''); // Removes the quotes from the backend string
              }

              //convert the data into blob (binary large object)
              const blob = await res.blob();
              //create a temporary url for the blob
              const url = window.URL.createObjectURL(blob);
              //create a temporary (hidden) <a> tag
              const link = document.createElement('a');
              link.href =url;
              //set download attribute with the filename we extracted
              link.setAttribute('download', filename)
              
              //append the link to the body of the html page associated with this code, that is open in the browser
              document.body.appendChild(link);
              //click it - trigger the download
              link.click() 
              //remove it from the body
              link.remove();
              //clean up the temporary url to save memory
              window.URL.revokeObjectURL(url);

              //ArchiveRow uses this to decide between success and a brief error state
              return true;
            }catch(err){
              console.error("Download failed:", err);
              return false;
            }
          }}
        />
      </main>
    </PageTransition>
  )
}
