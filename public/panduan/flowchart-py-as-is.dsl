sub2=>subroutine: terima_surat()
sub4=>subroutine: tulis_buku_agenda()
sub6=>subroutine: fotokopi_cap()
sub8=>subroutine: disposisi_kertas()
sub10=>subroutine: distribusi_manual()
sub12=>subroutine: arsip_rak()
cond15=>operation: ulang() if  risiko_ganda_hilang_lambat()

sub2->sub4
sub4->sub6
sub6->sub8
sub8->sub10
sub10->sub12
sub12->cond15
